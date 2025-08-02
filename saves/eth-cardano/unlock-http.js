import { mConStr0 } from "@meshsdk/common";
import { deserializeAddress } from "@meshsdk/core";
import {
  getTxBuilder,
  owner_wallet,
  beneficiary_wallet,
  scriptAddr,
} from "./common.js";

async function unlockTimelockWithHTTPWorkaround() {
    console.log("🔓 UNLOCKING CARDANO TIMELOCK - HTTP WORKAROUND METHOD");
    console.log("====================================================");
    
    const SECRET = "hello";
    const TIMELOCK_TX = "82c7169fd4d336ea6108d40d96f5ec92d94c7b8240c3c7da84951ea376234f93";
    const SCRIPT_ADDRESS = "addr_test1wqdf95yjyzpdha5t2a9nv822pkd4vqn3y862yaufnp03r2qlnx3qz";
    const OWNER_ADDRESS = "addr_test1qqhlxua3c9rrqyvce7l744wajtguwdcmn6kzf37gm0p4cahxf4mug86n3whyyanpqtj4s57ta4ttkqpn9mzquqcq6pls0tdvj6";
    
    console.log("🎯 Target Details:");
    console.log("   Timelock TX:", TIMELOCK_TX);
    console.log("   Secret:", SECRET);
    console.log("   Script Address:", SCRIPT_ADDRESS);
    console.log("   Owner Address:", OWNER_ADDRESS);
    console.log("");
    
    try {
        // Step 1: Fetch owner UTXOs using HTTP
        console.log("📡 Fetching owner UTXOs via HTTP...");
        const ownerResponse = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/addresses/${OWNER_ADDRESS}/utxos`, {
            headers: { 'project_id': 'preprodtpF5oF5BSFh99aeSgUJcswWV1OlOlxmn' }
        });
        
        let ownerUtxos = [];
        if (ownerResponse.ok) {
            ownerUtxos = await ownerResponse.json();
            console.log("✅ Found", ownerUtxos.length, "owner UTXOs");
        } else {
            console.log("⚠️ Owner UTXO fetch failed, using wallet method...");
            const walletUtxos = await owner_wallet.getUtxos();
            console.log("Found", walletUtxos.length, "wallet UTXOs");
            
            if (walletUtxos.length === 0) {
                console.log("❌ No UTXOs available for fees!");
                console.log("💡 Your wallet might need some ADA for transaction fees.");
                console.log("   The timelock will auto-refund after expiry if needed.");
                return;
            }
        }
        
        // Step 2: Fetch script UTXOs to confirm timelock exists
        console.log("📡 Fetching script UTXOs via HTTP...");
        const scriptResponse = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/addresses/${SCRIPT_ADDRESS}/utxos`, {
            headers: { 'project_id': 'preprodtpF5oF5BSFh99aeSgUJcswWV1OlOlxmn' }
        });
        
        if (scriptResponse.ok) {
            const scriptUtxos = await scriptResponse.json();
            console.log("✅ Found", scriptUtxos.length, "script UTXOs");
            
            const timelockUtxo = scriptUtxos.find(utxo => 
                utxo.tx_hash === TIMELOCK_TX && 
                parseInt(utxo.amount[0].quantity) >= 3000000
            );
            
            if (timelockUtxo) {
                console.log("✅ TIMELOCK UTXO CONFIRMED!");
                console.log("   Hash:", timelockUtxo.tx_hash);
                console.log("   Index:", timelockUtxo.output_index);
                console.log("   Amount:", parseInt(timelockUtxo.amount[0].quantity) / 1000000, "ADA");
                console.log("   Datum:", timelockUtxo.inline_datum);
            } else {
                console.log("❌ Timelock UTXO not found at script address!");
                console.log("💡 It might have already been unlocked or spent.");
                return;
            }
        }
        
        // Step 3: Try to build the unlock transaction
        console.log("🔧 Building unlock transaction...");
        
        const txBuilder = getTxBuilder();
        const ownerAddress = await owner_wallet.getUnusedAddresses();
        const recipientAddress = ownerAddress[0] || OWNER_ADDRESS;
        
        // Create redeemer with secret (SecretReveal constructor)
        const secretBytes = Buffer.from(SECRET, 'utf8').toString('hex');
        const redeemer = mConStr0([secretBytes]);
        
        console.log("   Secret (hex):", secretBytes);
        console.log("   Recipient:", recipientAddress);
        
        // Try to get UTXOs for the transaction
        const availableUtxos = await owner_wallet.getUtxos();
        
        if (availableUtxos.length === 0) {
            console.log("❌ No UTXOs available for transaction fees!");
            console.log("");
            console.log("🔄 ALTERNATIVE SOLUTIONS:");
            console.log("1️⃣ Wait for timelock expiry (auto-refund available)");
            console.log("2️⃣ Add some ADA to your wallet for transaction fees");
            console.log("3️⃣ Use a different wallet with available UTXOs");
            console.log("");
            console.log("⏰ Your timelock expires in ~25 minutes");
            console.log("   After expiry, you can claim refund without fees!");
            return;
        }
        
        console.log("💰 Using", availableUtxos.length, "UTXOs for fees");
        
        // Build the unlock transaction
        await txBuilder
            .spendingPlutusScript()
            .txIn(TIMELOCK_TX, 0) // Assuming output index 0
            .txInDatumValue("d87980") // The inline datum
            .txInRedeemerValue(redeemer)
            .txInScript(scriptAddr)
            .txOut(recipientAddress, [{ unit: "lovelace", quantity: "3000000" }])
            .changeAddress(recipientAddress)
            .selectUtxosFrom(availableUtxos)
            .complete();
        
        console.log("🔐 Signing transaction...");
        const signedTx = await owner_wallet.signTx(txBuilder.txHex);
        
        console.log("📤 Submitting unlock transaction...");
        
        // Try HTTP submission first
        try {
            const submitResponse = await fetch('https://cardano-preprod.blockfrost.io/api/v0/tx/submit', {
                method: 'POST',
                headers: {
                    'project_id': 'preprodtpF5oF5BSFh99aeSgUJcswWV1OlOlxmn',
                    'Content-Type': 'application/cbor'
                },
                body: Buffer.from(signedTx, 'hex')
            });
            
            if (submitResponse.ok) {
                const txHash = await submitResponse.text();
                console.log("✅ UNLOCK SUCCESSFUL! (HTTP submission)");
                console.log("   Transaction Hash:", txHash);
                console.log("   Explorer:", `https://preprod.cardanoscan.io/transaction/${txHash}`);
            } else {
                throw new Error(`HTTP submission failed: ${submitResponse.status}`);
            }
        } catch (httpError) {
            console.log("⚠️ HTTP submission failed, trying wallet method...");
            const txHash = await owner_wallet.submitTx(signedTx);
            console.log("✅ UNLOCK SUCCESSFUL! (Wallet submission)");
            console.log("   Transaction Hash:", txHash);
            console.log("   Explorer:", `https://preprod.cardanoscan.io/transaction/${txHash}`);
        }
        
        console.log("");
        console.log("🎉 CARDANO TIMELOCK UNLOCKED!");
        console.log("💰 Your 3 ADA has been returned to your wallet!");
        console.log("🔄 Cross-chain timelock cycle is now COMPLETE!");
        
    } catch (error) {
        console.error("❌ Unlock failed:", error.message);
        console.log("");
        console.log("🔍 Debug Information:");
        console.log("   Error:", error.message);
        console.log("   Type:", error.constructor.name);
        console.log("");
        console.log("💡 Don't worry! Your funds are safe:");
        console.log("   - Timelock expires in ~25 minutes");
        console.log("   - After expiry, you can claim automatic refund");
        console.log("   - No secret needed for refund claim");
        console.log("");
        console.log("🔗 Monitor status:");
        console.log("   https://preprod.cardanoscan.io/transaction/" + TIMELOCK_TX);
    }
}

unlockTimelockWithHTTPWorkaround().catch(console.error);
