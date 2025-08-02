import { mConStr0 } from "@meshsdk/common";
import { deserializeAddress } from "@meshsdk/core";
import { applyParamsToScript } from "@meshsdk/core-csl";
import {
  MeshWallet,
  BlockfrostProvider,
  MeshTxBuilder,
  serializePlutusScript,
} from "@meshsdk/core";
import fs from "fs";

// Use existing blockchainProvider and wallets
import { blockchainProvider, owner_wallet, getTxBuilder } from "./common.js";

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

async function depositFundTx(amount, lockUntilTimeStampMs) {
  const utxos = await owner_wallet.getUtxos();
  const txBuilder = getTxBuilder();
  await txBuilder
    .txOut(reverseScriptAddr, amount)
    .txOutInlineDatumValue(mConStr0([]))
    .changeAddress(owner_wallet.addresses.baseAddressBech32)
    .selectUtxosFrom(utxos)
    .complete();
  return txBuilder.txHex;
}

async function main() {
  const assets = [
    {
      unit: "lovelace",
      quantity: "3000000",
    },
  ];
  const lockUntilTimeStamp = new Date();
  lockUntilTimeStamp.setMinutes(lockUntilTimeStamp.getMinutes() + 10);
  const unsignedTx = await depositFundTx(assets, lockUntilTimeStamp.getTime());
  const signedTx = await owner_wallet.signTx(unsignedTx);
  const txHash = await owner_wallet.submitTx(signedTx);
  console.log("txHash", txHash);
}

main();
