import {
  deserializeAddress,
  deserializeDatum,
  unixTimeToEnclosingSlot,
  SLOT_CONFIG_NETWORK,
} from "@meshsdk/core";

import {
  getTxBuilder,
  beneficiary_wallet,
  blockchainProvider,
} from "./common.js";
import { mConStr0 } from "@meshsdk/common";
import { applyParamsToScript } from "@meshsdk/core-csl";
import { serializePlutusScript } from "@meshsdk/core";
import fs from "fs";

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

async function withdrawFundTx(vestingUtxo) {
  // Initialize wallet to get proper address
  await beneficiary_wallet.getUtxos(); // This initializes the addresses
  const beneficiaryAddress = beneficiary_wallet.addresses.baseAddressBech32;
  console.log("Using beneficiary address:", beneficiaryAddress);
  
  const apiKey = process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
  
  // Fetch UTXOs directly
  const response = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/addresses/${beneficiaryAddress}/utxos`, {
    headers: {
      'project_id': apiKey,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch UTXOs: ${response.status} - ${errorText}`);
  }
  
  const rawUtxos = await response.json();
  console.log("Found", rawUtxos.length, "UTXOs for beneficiary");
  
  // Convert to MeshSDK format
  const utxos = rawUtxos.map(utxo => ({
    input: {
      txHash: utxo.tx_hash,
      outputIndex: utxo.output_index
    },
    output: {
      amount: utxo.amount,
      address: beneficiaryAddress,
      dataHash: utxo.data_hash,
      plutusData: utxo.inline_datum,
      scriptRef: utxo.reference_script_hash
    }
  }));
  
  // Use first UTXO as collateral
  const collateralUtxo = utxos[0];
  const collateralInput = collateralUtxo.input;
  const collateralOutput = collateralUtxo.output;

  const { pubKeyHash: beneficiaryPubKeyHash } = deserializeAddress(beneficiaryAddress);

  const txBuilder = getTxBuilder();
  console.log("TxBuilder created");
  
  try {
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
        "0000000000000000000000000000000000000000000000000000000000000000",
      )
      .txInScript(reverseScriptCbor)
      .txOut(beneficiaryAddress, [])
      .txInCollateral(
        collateralInput.txHash,
        collateralInput.outputIndex,
        collateralOutput.amount,
        collateralOutput.address,
      )
      .requiredSignerHash(beneficiaryPubKeyHash)
      .changeAddress(beneficiaryAddress)
      .selectUtxosFrom(utxos)
      .complete();
    
    console.log("Transaction building completed successfully");
    return txBuilder.txHex;
  } catch (buildError) {
    console.error("Transaction building error:", buildError);
    console.error("Build error message:", buildError.message);
    console.error("Build error stack:", buildError.stack);
    throw buildError;
  }
}

async function main() {
  try {
    console.log("Starting reverse unlock process...");
    console.log("Reverse script address:", reverseScriptAddr);
    
    const txHashFromDeposit =
      "64a52a76d244763073fd636800b9563fc5d49b3cd3e45240037f203ca5e238a8";

    console.log("Looking for UTXO from tx:", txHashFromDeposit);
    const utxo = await getUtxoByTxHash(txHashFromDeposit);

    if (utxo === undefined) throw new Error("UTxO not found");

    console.log("Found UTXO, building withdrawal transaction...");
    const unsignedTx = await withdrawFundTx(utxo);

    console.log("Signing transaction...");
    try {
      const signedTx = await beneficiary_wallet.signTx(unsignedTx);
      console.log("Transaction signed successfully");

      console.log("Submitting transaction...");
      const txHash = await beneficiary_wallet.submitTx(signedTx);
      console.log("✅ SUCCESS! Transaction submitted!");
      console.log("txHash:", txHash);
      console.log("Secret revealed: 0x0000000000000000000000000000000000000000000000000000000000000000");
    } catch (signError) {
      console.error("Error during signing/submission:", signError);
      console.error("Sign error message:", signError.message);
      console.error("Sign error details:", JSON.stringify(signError, null, 2));
    }
  } catch (error) {
    console.error("Error in main:", error);
    console.error("Error message:", error.message);
    console.error("Error details:", JSON.stringify(error, null, 2));
  }
}

async function getUtxoByTxHash(txHash) {
  try {
    console.log("Fetching UTXOs from script address using direct API...");
    
    // Use direct Blockfrost API call instead of MeshSDK wrapper
    const apiKey = process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
    const baseUrl = "https://cardano-preprod.blockfrost.io/api/v0";
    
    const response = await fetch(`${baseUrl}/addresses/${reverseScriptAddr}/utxos`, {
      headers: {
        'project_id': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Blockfrost API error: ${response.status} ${response.statusText}`);
    }
    
    const rawUtxos = await response.json();
    console.log("Found", rawUtxos.length, "UTXOs at script address");
    
    // Convert to MeshSDK format
    const utxos = rawUtxos.map(utxo => ({
      input: {
        txHash: utxo.tx_hash,
        outputIndex: utxo.output_index
      },
      output: {
        amount: utxo.amount,
        address: reverseScriptAddr,
        dataHash: utxo.data_hash,
        plutusData: utxo.inline_datum,
        scriptRef: utxo.reference_script_hash
      }
    }));
    
    const targetUtxo = utxos.find(utxo => utxo.input.txHash === txHash);
    if (!targetUtxo) {
      console.log("Available UTXOs:");
      utxos.forEach((utxo, i) => {
        console.log(`UTXO ${i}:`, utxo.input.txHash);
      });
      throw new Error("UTxO not found");
    }
    return targetUtxo;
  } catch (error) {
    console.error("Error fetching UTXOs:", error);
    throw error;
  }
}

main();
