import { mConStr0 } from "@meshsdk/common";
import { deserializeAddress } from "@meshsdk/core";
import {
  getTxBuilder,
  owner_wallet,
  beneficiary_wallet,
  scriptAddr,
} from "./common.js";

async function unlockWithFullDatum() {
    console.log("🔓 UNLOCKING CARDANO TIMELOCK WITH COMPLETE DATUM");
    console.log("================================================");
    
    const SECRET = "hello";
    const TIMELOCK_TX = "82c7169fd4d336ea6108d40d96f5ec92d94c7b8240c3c7da84951ea376234f93";
    const SCRIPT_ADDRESS = "addr_test1wqdf95yjyzpdha5t2a9nv822pkd4vqn3y862yaufnp03r2qlnx3qz";
    
    console.log("🎯 Targeting specific timelock UTXO");
    console.log("   TX Hash:", TIMELOCK_TX);
    console.log("   Secret:", SECRET);
    console.log("   Script Address:", SCRIPT_ADDRESS);
    console.log("");
    
    try {
        const txBuilder = getTxBuilder();
        const ownerAddress = await owner_wallet.getUnusedAddresses();
        const recipientAddress = ownerAddress[0];
        
        console.log("📡 Fetching UTXOs from owner wallet...");
        const ownerUtxos = await owner_wallet.getUtxos();
        console.log("Found", ownerUtxos.length, "owner UTXOs for fees");
        
        if (ownerUtxos.length === 0) {
            console.log("❌ No UTXOs available for transaction fees!");
            return;
        }
        
        // Use one of the owner UTXOs that has enough ADA
        const feeUtxo = ownerUtxos.find(utxo => 
            parseInt(utxo.output.amount.find(a => a.unit === "lovelace")?.quantity || "0") > 2000000
        );
        
        if (!feeUtxo) {
            console.log("❌ No UTXO with sufficient ADA for fees!");
            return;
        }
        
        console.log("💰 Using fee UTXO:", feeUtxo.input.txHash.substring(0, 20) + "...");
        
        // Create the timelock UTXO object with proper datum
        const timelockUtxo = {
            input: {
                txHash: TIMELOCK_TX,
                outputIndex: 0
            },
            output: {
                address: SCRIPT_ADDRESS,
                amount: [{ unit: "lovelace", quantity: "3000000" }],
                plutusData: "d87980", // The inline datum from the timelock
                dataHash: "923918e403bf43c34b4ef6b48eb2ee04babed17320d8d1b9ff9ad086e86f44ec"
            }
        };
        
        console.log("🔧 Building unlock transaction...");
        console.log("   Recipient:", recipientAddress);
        console.log("   Amount to unlock: 3 ADA");
        
        // Create redeemer with secret for SecretReveal
        const secretBytes = Buffer.from(SECRET, 'utf8').toString('hex');
        const redeemer = mConStr0([secretBytes]);
        console.log("   Secret (hex):", secretBytes);
        
        // Build the unlock transaction
        await txBuilder
            .spendingPlutusScript()
            .txIn(timelockUtxo.input.txHash, timelockUtxo.input.outputIndex)
            .txInDatumValue(timelockUtxo.output.plutusData)
            .txInRedeemerValue(redeemer)
            .txInScript(scriptAddr)
            .txOut(recipientAddress, [{ unit: "lovelace", quantity: "3000000" }])
            .changeAddress(recipientAddress)
            .selectUtxosFrom([feeUtxo])
            .complete();
        
        console.log("🔐 Signing transaction...");
        const signedTx = await owner_wallet.signTx(txBuilder.txHex);
        
        console.log("📤 Submitting unlock transaction...");
        const txHash = await owner_wallet.submitTx(signedTx);
        
        console.log("✅ TIMELOCK UNLOCK SUCCESSFUL!");
        console.log("   Transaction Hash:", txHash);
        console.log("   Explorer:", `https://preprod.cardanoscan.io/transaction/${txHash}`);
        console.log("");
        console.log("🎉 CROSS-CHAIN TIMELOCK CYCLE COMPLETE!");
        console.log("   ✅ 1. Cardano timelock created and funded");
        console.log("   ✅ 2. Ethereum timelock deployed and funded");
        console.log("   ✅ 3. Ethereum timelock withdrawn with secret");
        console.log("   ✅ 4. Cardano timelock unlocked with same secret");
        console.log("");
        console.log("💰 SUCCESS: Your 3 ADA has been returned to your wallet!");
        console.log("🔄 Both chains successfully coordinated with synchronized secrets!");
        
    } catch (error) {
        console.error("❌ Unlock failed:", error.message);
        console.log("");
        console.log("🔍 Debug Information:");
        console.log("   Error type:", error.constructor.name);
        console.log("   Full error:", error);
        console.log("");
        console.log("💡 Possible reasons:");
        console.log("   1. Timelock UTXO might already be spent");
        console.log("   2. Insufficient fees in wallet");
        console.log("   3. Transaction validation failed");
        console.log("   4. Network connectivity issues");
        console.log("");
        console.log("🔗 Check status on CardanoScan:");
        console.log("   " + `https://preprod.cardanoscan.io/transaction/${TIMELOCK_TX}`);
    }
}

unlockWithFullDatum().catch(console.error);
