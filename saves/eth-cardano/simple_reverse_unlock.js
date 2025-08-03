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

// Use exact same pattern as unlock.js but with reverse validator
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
  const utxos = await beneficiary_wallet.getUtxos();
  const beneficiaryAddress = beneficiary_wallet.addresses.baseAddressBech32;
  const collateral = await beneficiary_wallet.getCollateral();
  const collateralInput = collateral[0].input;
  const collateralOutput = collateral[0].output;

  const { pubKeyHash: beneficiaryPubKeyHash } = deserializeAddress(
    beneficiary_wallet.addresses.baseAddressBech32,
  );

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
  return txBuilder.txHex;
}

async function main() {
  const txHashFromDeposit =
    "64a52a76d244763073fd636800b9563fc5d49b3cd3e45240037f203ca5e238a8";

  const utxo = await getUtxoByTxHash(txHashFromDeposit);

  if (utxo === undefined) throw new Error("UTxO not found");

  const unsignedTx = await withdrawFundTx(utxo);

  const signedTx = await beneficiary_wallet.signTx(unsignedTx);

  const txHash = await beneficiary_wallet.submitTx(signedTx);
  console.log("txHash", txHash);
  console.log("Secret revealed: 0x0000000000000000000000000000000000000000000000000000000000000000");
}

async function getUtxoByTxHash(txHash) {
  const utxos = await blockchainProvider.fetchUTxOs(reverseScriptAddr);
  const targetUtxo = utxos.find(utxo => utxo.input.txHash === txHash);
  if (!targetUtxo) {
    throw new Error("UTxO not found");
  }
  return targetUtxo;
}

main();
