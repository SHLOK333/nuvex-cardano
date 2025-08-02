import {
  MeshTxBuilder,
  serializePlutusScript,
} from "@meshsdk/core";
import { applyParamsToScript } from "@meshsdk/core-csl";
import { mConStr0 } from "@meshsdk/common";
import fs from "fs";

// Use existing setup from common.js
import { blockchainProvider, beneficiary_wallet, getTxBuilder } from "./common.js";

// Load reverse validator
const reverseBlueprint = JSON.parse(fs.readFileSync("../ada-eth-atomic-swap/cardano/escrow/reverse_validator/reverse_plutus.json"));
const reverseScriptCbor = applyParamsToScript(
  reverseBlueprint.validators[0].compiledCode,
  [
    "290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563",
    3000000000000,
  ],
);
const reverseScriptAddr = serializePlutusScript(
  { code: reverseScriptCbor, version: "V3" },
  undefined,
  0,
).address;

async function findUtxoByTxHash(txHash) {
  try {
    console.log("Looking for UTXO from tx:", txHash);
    
    // Get transaction details directly
    const txDetails = await blockchainProvider.fetchTxInfo(txHash);
    console.log("Transaction found and confirmed");
    
    // Find the output that goes to our script address
    const scriptOutput = txDetails.outputs.find(output => 
      output.address === reverseScriptAddr
    );
    
    if (scriptOutput) {
      // Construct UTXO object in the format expected by MeshSDK
      const utxo = {
        input: {
          txHash: txHash,
          outputIndex: scriptOutput.output_index
        },
        output: {
          address: scriptOutput.address,
          amount: scriptOutput.amount,
          dataHash: scriptOutput.data_hash,
          plutusData: scriptOutput.inline_datum
        }
      };
      
      console.log("Found target UTXO:", utxo);
      return utxo;
    } else {
      console.log("No output found at script address");
      return null;
    }
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return null;
  }
}

async function withdrawFundTx(vestingUtxo) {
  const utxos = await beneficiary_wallet.getUtxos();
  const beneficiaryAddress = beneficiary_wallet.addresses.baseAddressBech32;
  const collateral = await beneficiary_wallet.getCollateral();
  const collateralInput = collateral[0].input;
  const collateralOutput = collateral[0].output;
  const txBuilder = getTxBuilder();
  
  await txBuilder
    .spendingPlutusScript("V3")
    .txIn(
      vestingUtxo.input.txHash,
      vestingUtxo.input.outputIndex,
      vestingUtxo.output.amount,
      reverseScriptAddr,
    )
    .spendingReferenceTxInInlineDatumPresent()
    .spendingReferenceTxInRedeemerValue(
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    )
    .txInScript(reverseScriptCbor)
    .txOut(beneficiaryAddress, [])
    .txInCollateral(
      collateralInput.txHash,
      collateralInput.outputIndex,
      collateralOutput.amount,
      collateralOutput.address,
    )
    .requiredSignerHash(beneficiary_wallet.addresses.baseAddressBech32)
    .changeAddress(beneficiaryAddress)
    .selectUtxosFrom(utxos)
    .complete();
  return txBuilder.txHex;
}

async function main() {
  const lockTxHash = "64a52a76d244763073fd636800b9563fc5d49b3cd3e45240037f203ca5e238a8";
  
  console.log("Looking for UTXO from lock transaction...");
  const vestingUtxo = await findUtxoByTxHash(lockTxHash);
  
  if (!vestingUtxo) {
    console.log("Could not find the locked UTXO. Please check if the transaction is confirmed.");
    return;
  }
  
  console.log("Building withdrawal transaction...");
  const unsignedTx = await withdrawFundTx(vestingUtxo);
  const signedTx = await beneficiary_wallet.signTx(unsignedTx);
  const txHash = await beneficiary_wallet.submitTx(signedTx);
  console.log("Withdrawal txHash:", txHash);
  console.log("Secret revealed: 0x0000000000000000000000000000000000000000000000000000000000000000");
}

main().catch(console.error);
