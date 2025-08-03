import { mConStr0 } from "@meshsdk/common";
import { deserializeAddress } from "@meshsdk/core";
import {
  getTxBuilder,
  owner_wallet,
  scriptAddr,
} from "./reverse_common.js";

async function depositFundTx(amount, lockUntilTimeStampMs) {
  const utxos = await owner_wallet.getUtxos();
  const txBuilder = getTxBuilder();
  await txBuilder
    .txOut(scriptAddr, amount)
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