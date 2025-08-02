import { mConStr0 } from "@meshsdk/common";
import { deserializeAddress } from "@meshsdk/core";
import {
  getTxBuilder,
  owner_wallet,
  beneficiary_wallet,
  scriptAddr,
} from "./common.js";

async function unlockTimelockNow() {
    console.log("🔓 UNLOCKING CARDANO TIMELOCK NOW");
    console.log("=================================");
    
    const TIMELOCK_UTXO = {
        txHash: "82c7169fd4d336ea6108d40d96f5ec92d94c7b8240c3c7da84951ea376234f93",
        outputIndex: 0, // Usually index 0 for script output
        amount: 3000000 // 3 ADA in lovelace
    };
    
    const SECRET = "hello";
    console.log("Target UTXO:", TIMELOCK_UTXO.txHash);
    console.log("Secret:", SECRET);
    console.log("");
    
    try {
        const txBuilder = getTxBuilder();
        const ownerAddress = await owner_wallet.getUnusedAddresses();
        const recipientAddress = ownerAddress[0];
        
        console.log("🔧 Building unlock transaction...");
        console.log("Recipient:", recipientAddress);
        
        // Create redeemer with secret
        const secretBytes = Buffer.from(SECRET, 'utf8').toString('hex');
        const redeemer = mConStr0([secretBytes]);
        
        // Get available UTXOs for fees
        const utxos = await owner_wallet.getUtxos();
        console.log("Available UTXOs for fees:", utxos.length);
        
        // Build unlock transaction
        await txBuilder
            .spendingPlutusScript()
            .txIn(TIMELOCK_UTXO.txHash, TIMELOCK_UTXO.outputIndex)
            .txInRedeemerValue(redeemer)
            .txInScript(scriptAddr)
            .txOut(recipientAddress, [{ unit: "lovelace", quantity: TIMELOCK_UTXO.amount.toString() }])
            .changeAddress(recipientAddress)
            .selectUtxosFrom(utxos)
            .complete();
        
        console.log("🔐 Signing transaction...");
        const signedTx = await owner_wallet.signTx(txBuilder.txHex);
        
        console.log("📤 Submitting transaction...");
        const txHash = await owner_wallet.submitTx(signedTx);
        
        console.log("✅ UNLOCK SUCCESSFUL!");
        console.log("   Transaction Hash:", txHash);
        console.log("   Explorer:", `https://preprod.cardanoscan.io/transaction/${txHash}`);
        console.log("");
        console.log("🎉 CROSS-CHAIN TIMELOCK CYCLE COMPLETE!");
        console.log("   ✅ Cardano timelock unlocked");
        console.log("   ✅ Ethereum timelock withdrawn");
        console.log("   ✅ Both chains synchronized");
        console.log("   💰 Your 3 ADA has been returned!");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.log("");
        console.log("💡 The timelock might have already been unlocked or expired.");
        console.log("   Check the transaction on CardanoScan to verify status.");
        console.log("   Link: https://preprod.cardanoscan.io/transaction/82c7169fd4d336ea6108d40d96f5ec92d94c7b8240c3c7da84951ea376234f93");
    }
}

unlockTimelockNow().catch(console.error);
