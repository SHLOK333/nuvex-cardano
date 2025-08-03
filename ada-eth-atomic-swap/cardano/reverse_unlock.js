import {
  getTxBuilder,
  beneficiary_wallet,
  scriptAddr,
  scriptCbor,
  blockchainProvider,
} from "./reverse_common.js";
import { mConStr0 } from "@meshsdk/common";

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
      scriptAddr,
    )
    .spendingReferenceTxInInlineDatumPresent()
    .spendingReferenceTxInRedeemerValue(
      "0000000000000000000000000000000000000000000000000000000000000000",
    )
    .txInScript(scriptCbor)
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
  // TODO: Find the correct UTXO to spend
  // const vestingUtxo = ...
  // const unsignedTx = await withdrawFundTx(vestingUtxo);
  // const signedTx = await beneficiary_wallet.signTx(unsignedTx);
  // const txHash = await beneficiary_wallet.submitTx(signedTx);
  // console.log("txHash", txHash);
}

main(); 