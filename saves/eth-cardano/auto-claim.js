import { mConStr0 } from "@meshsdk/common";
import { deserializeAddress } from "@meshsdk/core";
import {
  getTxBuilder,
  owner_wallet,
  beneficiary_wallet,
  scriptAddr,
} from "./common.js";

async function automatedTimelockClaim() {
    console.log("🤖 AUTOMATED TIMELOCK CLAIM");
    console.log("===========================");
    console.log("🔄 This script will automatically:");
    console.log("   1. Check timelock status");
    console.log("   2. Try unlock with secret if possible");
    console.log("   3. Wait for expiry if needed");
    console.log("   4. Claim refund after expiry");
    console.log("   5. Return your 3 ADA automatically!");
    console.log("");
    
    const SECRET = "hello";
    const TIMELOCK_TX = "82c7169fd4d336ea6108d40d96f5ec92d94c7b8240c3c7da84951ea376234f93";
    const SCRIPT_ADDRESS = "addr_test1wqdf95yjyzpdha5t2a9nv822pkd4vqn3y862yaufnp03r2qlnx3qz";
    const OWNER_ADDRESS = "addr_test1qqhlxua3c9rrqyvce7l744wajtguwdcmn6kzf37gm0p4cahxf4mug86n3whyyanpqtj4s57ta4ttkqpn9mzquqcq6pls0tdvj6";
    const EXPIRY_TIME = new Date("2025-08-02T10:07:39.000Z");
    
    while (true) {
        try {
            const now = new Date();
            const timeUntilExpiry = EXPIRY_TIME.getTime() - now.getTime();
            const isExpired = timeUntilExpiry <= 0;
            
            console.log("⏰ STATUS CHECK:", now.toISOString());
            
            if (isExpired) {
                const timeExpired = Math.abs(timeUntilExpiry);
                const minutes = Math.floor(timeExpired / (1000 * 60));
                console.log(`✅ TIMELOCK EXPIRED ${minutes} minutes ago!`);
                console.log("🔄 Attempting refund claim...");
                
                // Try refund claim (no secret needed)
                const refundSuccess = await attemptRefundClaim(TIMELOCK_TX, SCRIPT_ADDRESS, OWNER_ADDRESS);
                if (refundSuccess) {
                    console.log("🎉 SUCCESS! Your 3 ADA has been returned!");
                    break;
                } else {
                    console.log("⚠️ Refund attempt failed, retrying in 30 seconds...");
                    await sleep(30000);
                    continue;
                }
            } else {
                const minutes = Math.floor(timeUntilExpiry / (1000 * 60));
                const seconds = Math.floor((timeUntilExpiry % (1000 * 60)) / 1000);
                console.log(`⏳ Time until expiry: ${minutes}m ${seconds}s`);
                
                // Check if we have UTXOs to attempt unlock
                const utxos = await owner_wallet.getUtxos();
                if (utxos.length > 0) {
                    console.log("💰 UTXOs available! Attempting unlock with secret...");
                    const unlockSuccess = await attemptSecretUnlock(TIMELOCK_TX, SCRIPT_ADDRESS, OWNER_ADDRESS, SECRET);
                    if (unlockSuccess) {
                        console.log("🎉 SUCCESS! Unlocked with secret!");
                        break;
                    } else {
                        console.log("⚠️ Secret unlock failed, waiting for expiry...");
                    }
                } else {
                    console.log("💡 No UTXOs for fees, waiting for expiry...");
                }
                
                // Wait 30 seconds before checking again
                console.log("⏳ Checking again in 30 seconds...");
                await sleep(30000);
            }
        } catch (error) {
            console.error("❌ Error in automation:", error.message);
            console.log("🔄 Retrying in 30 seconds...");
            await sleep(30000);
        }
    }
    
    console.log("");
    console.log("🏆 AUTOMATED TIMELOCK CLAIM COMPLETE!");
    console.log("✅ Cross-chain timelock implementation successful!");
    console.log("💰 Your 3 ADA has been returned to your wallet!");
}

async function attemptSecretUnlock(timelockTx, scriptAddress, ownerAddress, secret) {
    try {
        console.log("🔓 Attempting secret unlock...");
        
        // Check if timelock UTXO still exists
        const scriptUtxos = await fetchUtxosHTTP(scriptAddress);
        const timelockUtxo = scriptUtxos.find(utxo => 
            utxo.tx_hash === timelockTx && 
            parseInt(utxo.amount[0].quantity) >= 3000000
        );
        
        if (!timelockUtxo) {
            console.log("❌ Timelock UTXO not found (might be already spent)");
            return false;
        }
        
        const txBuilder = getTxBuilder();
        const availableUtxos = await owner_wallet.getUtxos();
        
        if (availableUtxos.length === 0) {
            console.log("❌ No UTXOs for fees");
            return false;
        }
        
        // Create redeemer with secret
        const secretBytes = Buffer.from(secret, 'utf8').toString('hex');
        const redeemer = mConStr0([secretBytes]);
        
        // Build unlock transaction
        await txBuilder
            .spendingPlutusScript()
            .txIn(timelockTx, timelockUtxo.output_index)
            .txInDatumValue(timelockUtxo.inline_datum || "d87980")
            .txInRedeemerValue(redeemer)
            .txInScript(scriptAddr)
            .txOut(ownerAddress, [{ unit: "lovelace", quantity: "3000000" }])
            .changeAddress(ownerAddress)
            .selectUtxosFrom(availableUtxos)
            .complete();
        
        const signedTx = await owner_wallet.signTx(txBuilder.txHex);
        const txHash = await submitTransactionHTTP(signedTx);
        
        console.log("✅ Secret unlock successful!");
        console.log("   TX Hash:", txHash);
        console.log("   Explorer:", `https://preprod.cardanoscan.io/transaction/${txHash}`);
        
        return true;
        
    } catch (error) {
        console.log("❌ Secret unlock failed:", error.message);
        return false;
    }
}

async function attemptRefundClaim(timelockTx, scriptAddress, ownerAddress) {
    try {
        console.log("🔄 Attempting refund claim...");
        
        // Check if timelock UTXO still exists
        const scriptUtxos = await fetchUtxosHTTP(scriptAddress);
        const timelockUtxo = scriptUtxos.find(utxo => 
            utxo.tx_hash === timelockTx && 
            parseInt(utxo.amount[0].quantity) >= 3000000
        );
        
        if (!timelockUtxo) {
            console.log("❌ Timelock UTXO not found (might be already claimed)");
            return false;
        }
        
        console.log("✅ Found timelock UTXO, building refund transaction...");
        
        const txBuilder = getTxBuilder();
        
        // For refund, we use RefundClaim redeemer (no secret needed)
        const redeemer = mConStr0([]); // RefundClaim constructor
        
        // Try to get UTXOs - if none available, the refund might still work with minimal fees
        let availableUtxos = await owner_wallet.getUtxos();
        
        // Build refund transaction
        await txBuilder
            .spendingPlutusScript()
            .txIn(timelockTx, timelockUtxo.output_index)
            .txInDatumValue(timelockUtxo.inline_datum || "d87980")
            .txInRedeemerValue(redeemer)
            .txInScript(scriptAddr)
            .txOut(ownerAddress, [{ unit: "lovelace", quantity: "3000000" }])
            .changeAddress(ownerAddress)
            .validFrom(Math.floor(Date.now() / 1000)) // Valid from now (after expiry)
            .selectUtxosFrom(availableUtxos)
            .complete();
        
        const signedTx = await owner_wallet.signTx(txBuilder.txHex);
        const txHash = await submitTransactionHTTP(signedTx);
        
        console.log("✅ Refund claim successful!");
        console.log("   TX Hash:", txHash);
        console.log("   Explorer:", `https://preprod.cardanoscan.io/transaction/${txHash}`);
        
        return true;
        
    } catch (error) {
        console.log("❌ Refund claim failed:", error.message);
        return false;
    }
}

async function fetchUtxosHTTP(address) {
    try {
        const response = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/addresses/${address}/utxos`, {
            headers: { 'project_id': 'preprodtpF5oF5BSFh99aeSgUJcswWV1OlOlxmn' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.log("⚠️ HTTP UTXO fetch failed:", error.message);
        return [];
    }
}

async function submitTransactionHTTP(signedTx) {
    try {
        const response = await fetch('https://cardano-preprod.blockfrost.io/api/v0/tx/submit', {
            method: 'POST',
            headers: {
                'project_id': 'preprodtpF5oF5BSFh99aeSgUJcswWV1OlOlxmn',
                'Content-Type': 'application/cbor'
            },
            body: Buffer.from(signedTx, 'hex')
        });
        
        if (!response.ok) {
            throw new Error(`HTTP submission failed: ${response.status}`);
        }
        
        return await response.text();
    } catch (error) {
        // Fallback to wallet submission
        return await owner_wallet.submitTx(signedTx);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the automated claim
automatedTimelockClaim().catch(console.error);
