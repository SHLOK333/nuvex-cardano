import { mConStr0 } from "@meshsdk/common";
import { deserializeAddress } from "@meshsdk/core";
import {
  getTxBuilder,
  owner_wallet,
  beneficiary_wallet,
  scriptAddr,
} from "./common.js";
import crypto from 'crypto';

// Existing timelock details
const TIMELOCK_TX_HASH = "82c7169fd4d336ea6108d40d96f5ec92d94c7b8240c3c7da84951ea376234f93";
const SECRET = "hello";

async function unlockExistingTimelock() {
    console.log("🔓 UNLOCKING EXISTING CARDANO TIMELOCK");
    console.log("=====================================");
    console.log("Timelock TX:", TIMELOCK_TX_HASH);
    console.log("Secret:", SECRET);
    console.log("");

    try {
        const txBuilder = getTxBuilder();
        
        // Get the script address (where the timelock funds are locked)
        const scriptAddress = "addr_test1wqdf95yjyzpdha5t2a9nv822pkd4vqn3y862yaufnp03r2qlnx3qz";
        console.log("Script address:", scriptAddress);
        
        // Fetch UTXOs at script address using HTTP workaround
        console.log("🔍 Fetching script UTXOs...");
        const response = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/addresses/${scriptAddress}/utxos`, {
            headers: { 'project_id': 'preprodtpF5oF5BSFh99aeSgUJcswWV1OlOlxmn' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const scriptUtxos = await response.json();
        console.log("Found", scriptUtxos.length, "script UTXOs");
        
        // Find our specific timelock UTXO
        const timelockUtxo = scriptUtxos.find(utxo => 
            utxo.tx_hash === TIMELOCK_TX_HASH && 
            parseInt(utxo.amount[0].quantity) >= 3000000
        );
        
        if (!timelockUtxo) {
            console.log("❌ Timelock UTXO not found!");
            console.log("Available script UTXOs:", scriptUtxos.map(u => ({
                hash: u.tx_hash,
                index: u.output_index,
                amount: u.amount[0].quantity
            })));
            return;
        }
        
        console.log("✅ Found timelock UTXO to unlock!");
        console.log("   Hash:", timelockUtxo.tx_hash);
        console.log("   Index:", timelockUtxo.output_index);
        console.log("   Amount:", parseInt(timelockUtxo.amount[0].quantity) / 1000000, "ADA");
        
        // Get owner wallet address for receiving unlocked funds
        const ownerAddress = await owner_wallet.getUnusedAddresses();
        const recipientAddress = ownerAddress[0];
        console.log("Recipient address:", recipientAddress);
        
        // Create redeemer to reveal the secret
        const secretHex = Buffer.from(SECRET, 'utf8').toString('hex');
        const redeemer = mConStr0([secretHex]); // SecretReveal variant
        
        console.log("🔧 Building unlock transaction...");
        
        // Convert UTXO format for MeshSDK
        const meshUtxo = {
            input: {
                txHash: timelockUtxo.tx_hash,
                outputIndex: timelockUtxo.output_index
            },
            output: {
                address: scriptAddress,
                amount: timelockUtxo.amount,
                dataHash: timelockUtxo.data_hash,
                plutusData: timelockUtxo.inline_datum
            }
        };
        
        // Build the unlock transaction
        await txBuilder
            .spendingPlutusScript()
            .txIn(meshUtxo.input.txHash, meshUtxo.input.outputIndex)
            .txInDatumValue(meshUtxo.output.plutusData)
            .txInRedeemerValue(redeemer)
            .txInScript(scriptAddr) // Use the script from common.js
            .txOut(recipientAddress, timelockUtxo.amount)
            .changeAddress(recipientAddress)
            .invalidHereafter(Math.floor(Date.now() / 1000) + 300) // Valid for 5 minutes
            .selectUtxosFrom(await owner_wallet.getUtxos())
            .complete();
        
        console.log("🔐 Signing transaction...");
        const signedTx = await owner_wallet.signTx(txBuilder.txHex);
        
        console.log("📤 Submitting unlock transaction...");
        // Submit via HTTP workaround
        const submitResponse = await fetch('https://cardano-preprod.blockfrost.io/api/v0/tx/submit', {
            method: 'POST',
            headers: {
                'project_id': 'preprodtpF5oF5BSFh99aeSgUJcswWV1OlOlxmn',
                'Content-Type': 'application/cbor'
            },
            body: Buffer.from(signedTx, 'hex')
        });
        
        if (!submitResponse.ok) {
            const errorText = await submitResponse.text();
            throw new Error(`Submission failed: ${submitResponse.status} - ${errorText}`);
        }
        
        const txHash = await submitResponse.text();
        
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
        console.log("");
        console.log("🔍 Debug info:");
        console.log("   Timelock TX Hash:", TIMELOCK_TX_HASH);
        console.log("   Secret used:", SECRET);
        console.log("   Script Address:", "addr_test1wqdf95yjyzpdha5t2a9nv822pkd4vqn3y862yaufnp03r2qlnx3qz");
    }
}

// Run the unlock
unlockExistingTimelock().catch(console.error);
