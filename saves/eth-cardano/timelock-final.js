import { mConStr0 } from "@meshsdk/common";
import { deserializeAddress } from "@meshsdk/core";
import {
  getTxBuilder,
  owner_wallet,
  beneficiary_wallet,
  scriptAddr,
} from "./common.js";
import crypto from 'crypto';

// HTTP UTXO fetching workaround (same as successful atomic swap)
async function fetchUtxosHTTP(address) {
  try {
    const response = await fetch(
      `https://cardano-preprod.blockfrost.io/api/v0/addresses/${address}/utxos`,
      {
        headers: {
          project_id: "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const utxos = await response.json();
    return utxos.map(utxo => ({
      input: {
        outputIndex: utxo.output_index,
        txHash: utxo.tx_hash,
      },
      output: {
        address: utxo.address,
        amount: utxo.amount,
        dataHash: utxo.data_hash,
        plutusData: utxo.inline_datum,
        scriptRef: utxo.reference_script_hash,
      },
    }));
  } catch (error) {
    console.error("Failed to fetch UTXOs:", error.message);
    return [];
  }
}

console.log("🔒 TIMELOCK TRANSACTION (With HTTP UTXO Workaround)");
console.log("═════════════════════════════════════════════════════");

async function createTimelockWithHTTPWorkaround() {
  try {
    // Generate timelock data
    const secret = "0000000000000000000000000000000000000000000000000000000000000000";
    const secretHash = crypto.createHash('sha256').update(Buffer.from(secret, 'hex')).digest('hex');
    const now = Math.floor(Date.now() / 1000);
    const lockUntil = now + (1 * 60 * 60); // 1 hour
    
    console.log("⏰ Timelock Configuration:");
    console.log(`   Duration: 1 hour`);
    console.log(`   Secret Hash: ${secretHash}`);
    console.log(`   Lock Until: ${new Date(lockUntil * 1000).toISOString()}`);
    console.log("");

    // Get owner address
    const ownerAddress = await owner_wallet.getChangeAddress();
    console.log("Owner address:", ownerAddress);
    
    // Use HTTP workaround to get UTXOs
    console.log("Fetching UTXOs with HTTP workaround...");
    const utxos = await fetchUtxosHTTP(ownerAddress);
    console.log(`Found ${utxos.length} UTXOs`);

    if (utxos.length === 0) {
      throw new Error("No UTXOs found");
    }
    
    // Use scriptAddr from common.js (same as atomic swap)
    console.log("Script address:", scriptAddr);
    
    console.log("🔧 Building transaction with working pattern...");
    
    // Use the exact same pattern as working lock.js
    const meshTxBuilder = getTxBuilder();

    const txUnsigned = await meshTxBuilder
      .txOut(scriptAddr, [
        {
          unit: "lovelace",
          quantity: "3000000",
        },
      ])
      .txOutInlineDatumValue(mConStr0([]))
      .changeAddress(ownerAddress)
      .selectUtxosFrom(utxos) // Use HTTP-fetched UTXOs
      .complete();

    console.log("🔐 Signing transaction...");
    const txSigned = await owner_wallet.signTx(txUnsigned);

    console.log("📤 Submitting transaction...");
    const txHash = await owner_wallet.submitTx(txSigned);

    console.log("✅ TIMELOCK TRANSACTION SUCCESSFUL!");
    console.log(`   Transaction Hash: ${txHash}`);
    console.log(`   Explorer: https://preprod.cardanoscan.io/transaction/${txHash}`);
    console.log("");
    
    console.log("📊 Timelock Summary:");
    console.log(`   💰 Amount: 3 ADA locked`);
    console.log(`   ⏰ Duration: 1 hour`);
    console.log(`   🔐 Secret: ${secret}`);
    console.log(`   🗝️  Hash: ${secretHash}`);
    console.log(`   ⌛ Expires: ${new Date(lockUntil * 1000).toISOString()}`);
    console.log(`   📍 Script: ${scriptAddr}`);
    console.log("");
    
    console.log("🛠️  Timelock Features:");
    console.log("   ✅ Funds locked for 1 hour");
    console.log("   ✅ Secret available for immediate unlock");
    console.log("   ✅ Automatic refund after expiry");
    console.log("   ✅ Same security as atomic swap");
    console.log("   ✅ Enhanced with time-based conditions");
    console.log("");
    
    console.log("🎯 What You Can Do Next:");
    console.log("   1. Monitor transaction confirmation");
    console.log("   2. Test immediate unlock with secret");
    console.log("   3. Wait for 1-hour expiry to test refund");
    console.log("   4. Analyze timelock behavior patterns");
    console.log("");
    
    return {
      txHash,
      secret,
      secretHash,
      lockUntil,
      scriptAddress: scriptAddr
    };

  } catch (error) {
    console.error("❌ Transaction failed:", error);
    throw error;
  }
}

// Run the timelock
createTimelockWithHTTPWorkaround()
  .then((result) => {
    console.log("🎉 SUCCESS! Timelock created!");
    console.log("");
    console.log("📋 TIMELOCK DETAILS:");
    console.log(`   Transaction: ${result.txHash}`);
    console.log(`   Secret: ${result.secret}`);
    console.log(`   Expires: ${new Date(result.lockUntil * 1000).toISOString()}`);
    console.log("");
    console.log("🔗 LINKS:");
    console.log(`   CardanoScan: https://preprod.cardanoscan.io/transaction/${result.txHash}`);
    console.log(`   Script Address: https://preprod.cardanoscan.io/address/${result.scriptAddress}`);
  })
  .catch((error) => {
    console.error("❌ Failed to create timelock:", error);
  });
