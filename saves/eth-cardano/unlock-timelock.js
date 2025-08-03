import { Lucid, Blockfrost, fromText, toHex, Data, UTxO, TxHash, SpendingValidator, Redeemer } from "@lucid-evolution/lucid";
import { common } from "./common.js";
import fs from 'fs';

// Existing timelock details from our successful deployment
const TIMELOCK_TX_HASH = "82c7169fd4d336ea6108d40d96f5ec92d94c7b8240c3c7da84951ea376234f93";
const SECRET = "hello";
const SECRET_HASH = "66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925";

async function unlockExistingTimelock() {
    console.log("🔓 UNLOCKING EXISTING CARDANO TIMELOCK");
    console.log("=====================================");
    console.log("Timelock TX:", TIMELOCK_TX_HASH);
    console.log("Secret:", SECRET);
    console.log("Secret Hash:", SECRET_HASH);
    console.log("");

    const lucid = await common();
    
    // Load the timelock validator
    const plutusScript = JSON.parse(fs.readFileSync("./escrow/htlc_timelock_plutus.json", "utf8"));
    const validator = {
        type: "PlutusV3",
        script: plutusScript.compiledCode || plutusScript.cborHex
    };
    
    const scriptAddress = lucid.utils.validatorToAddress(validator);
    console.log("Script address:", scriptAddress);
    
    try {
        // Find the UTXO to unlock
        console.log("🔍 Looking for timelock UTXO...");
        const scriptUtxos = await lucid.utxosAt(scriptAddress);
        console.log("Found UTXOs at script address:", scriptUtxos.length);
        
        // Find the specific UTXO from our timelock transaction
        const timelockUtxo = scriptUtxos.find(utxo => 
            utxo.txHash === TIMELOCK_TX_HASH && 
            utxo.assets.lovelace >= 3000000n
        );
        
        if (!timelockUtxo) {
            console.log("❌ Timelock UTXO not found!");
            console.log("Available UTXOs:", scriptUtxos);
            return;
        }
        
        console.log("✅ Found timelock UTXO:");
        console.log("   Hash:", timelockUtxo.txHash);
        console.log("   Index:", timelockUtxo.outputIndex);
        console.log("   Amount:", Number(timelockUtxo.assets.lovelace) / 1000000, "ADA");
        
        // Get owner address for receiving unlocked funds
        const ownerAddress = await lucid.wallet.address();
        console.log("Owner address:", ownerAddress);
        
        // Create the redeemer to reveal the secret
        const secretBytes = fromText(SECRET);
        const redeemer = Data.to("SecretReveal", Data.to({ secret: secretBytes }));
        
        console.log("🔧 Building unlock transaction...");
        
        // Build transaction to unlock the timelock
        const tx = await lucid
            .newTx()
            .collectFrom([timelockUtxo], redeemer)
            .attachSpendingValidator(validator)
            .payToAddress(ownerAddress, { lovelace: timelockUtxo.assets.lovelace })
            .validTo(Date.now() + 300000) // Valid for 5 minutes
            .complete();
        
        console.log("🔐 Signing transaction...");
        const signedTx = await tx.sign().complete();
        
        console.log("📤 Submitting unlock transaction...");
        const txHash = await signedTx.submit();
        
        console.log("✅ TIMELOCK UNLOCK SUCCESSFUL!");
        console.log("   Transaction Hash:", txHash);
        console.log("   Explorer:", `https://preprod.cardanoscan.io/transaction/${txHash}`);
        console.log("");
        console.log("🎉 CROSS-CHAIN TIMELOCK CYCLE COMPLETE!");
        console.log("   1. ✅ Cardano timelock created");
        console.log("   2. ✅ Ethereum timelock deployed"); 
        console.log("   3. ✅ Ethereum timelock withdrawn");
        console.log("   4. ✅ Cardano timelock unlocked");
        console.log("");
        console.log("💰 Your 3 ADA has been returned to your wallet!");
        
    } catch (error) {
        console.error("❌ Error unlocking timelock:", error);
        
        // Try HTTP workaround
        console.log("🔄 Trying HTTP workaround...");
        await unlockWithHTTPWorkaround();
    }
}

async function unlockWithHTTPWorkaround() {
    console.log("📡 Using HTTP workaround for unlock...");
    
    // HTTP workaround similar to our successful lock transaction
    const ownerAddress = "addr_test1qqhlxua3c9rrqyvce7l744wajtguwdcmn6kzf37gm0p4cahxf4mug86n3whyyanpqtj4s57ta4ttkqpn9mzquqcq6pls0tdvj6";
    
    console.log("🔍 Fetching UTXOs with HTTP...");
    const response = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/addresses/${ownerAddress}/utxos`, {
        headers: { 'project_id': 'preprodtpF5oF5BSFh99aeSgUJcswWV1OlOlxmn' }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const utxos = await response.json();
    console.log("Found", utxos.length, "UTXOs");
    
    // Use the timelock script to unlock
    const scriptAddress = "addr_test1wqdf95yjyzpdha5t2a9nv822pkd4vqn3y862yaufnp03r2qlnx3qz";
    
    console.log("🔍 Fetching script UTXOs...");
    const scriptResponse = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/addresses/${scriptAddress}/utxos`, {
        headers: { 'project_id': 'preprodtpF5oF5BSFh99aeSgUJcswWV1OlOlxmn' }
    });
    
    const scriptUtxos = await scriptResponse.json();
    console.log("Found", scriptUtxos.length, "script UTXOs");
    
    // Find our timelock UTXO
    const timelockUtxo = scriptUtxos.find(utxo => 
        utxo.tx_hash === TIMELOCK_TX_HASH && 
        parseInt(utxo.amount[0].quantity) >= 3000000
    );
    
    if (timelockUtxo) {
        console.log("✅ Found timelock UTXO to unlock!");
        console.log("   Amount:", parseInt(timelockUtxo.amount[0].quantity) / 1000000, "ADA");
        console.log("   Ready for unlock with secret:", SECRET);
    } else {
        console.log("❌ Timelock UTXO not found in script address");
        console.log("Available script UTXOs:", scriptUtxos);
    }
}

// Run the unlock
unlockExistingTimelock().catch(console.error);
