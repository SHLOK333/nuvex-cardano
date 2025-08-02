import { owner_wallet, beneficiary_wallet, getTxBuilder } from "./common.js";

async function sendCollateral() {
  try {
    console.log("Sending collateral from owner to beneficiary...");
    
    const ownerUtxos = await owner_wallet.getUtxos();
    console.log("Owner UTXOs:", ownerUtxos.length);
    
    if (ownerUtxos.length === 0) {
      console.log("❌ Owner wallet has no UTXOs. Please fund the owner wallet first.");
      console.log("Owner address:", owner_wallet.addresses.baseAddressBech32);
      return;
    }
    
    const beneficiaryAddress = beneficiary_wallet.addresses.baseAddressBech32;
    const ownerAddress = owner_wallet.addresses.baseAddressBech32;
    
    console.log("From (owner):", ownerAddress);
    console.log("To (beneficiary):", beneficiaryAddress);
    
    const txBuilder = getTxBuilder();
    await txBuilder
      .txOut(beneficiaryAddress, [{ unit: "lovelace", quantity: "5000000" }]) // 5 ADA
      .changeAddress(ownerAddress)
      .selectUtxosFrom(ownerUtxos)
      .complete();
    
    const unsignedTx = txBuilder.txHex;
    const signedTx = await owner_wallet.signTx(unsignedTx);
    const txHash = await owner_wallet.submitTx(signedTx);
    
    console.log("✅ Collateral sent! TxHash:", txHash);
    console.log("Wait a moment for confirmation, then run reverse_unlock.js again");
    
  } catch (error) {
    console.error("Error sending collateral:", error);
  }
}

sendCollateral();
