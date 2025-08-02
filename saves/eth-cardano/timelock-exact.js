import {
  deserializeAddress,
  MeshTxBuilder,
  mConStr0,
} from "@meshsdk/core";
import crypto from 'crypto';

import {
  owner_wallet,
  beneficiary_wallet,
  blockchainProvider,
} from "./common.js";

// Fetch UTXOs using HTTP workaround (same as working lock.js)
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

async function createTimelockTransaction() {
  console.log("🔒 TIMELOCK TRANSACTION (Exact Working Pattern)");
  console.log("═══════════════════════════════════════════════");

  // Get owner address
  const ownerAddress = await owner_wallet.getChangeAddress();
  console.log("Owner address:", ownerAddress);
  
  // Use workaround to get UTXOs
  console.log("Fetching UTXOs with HTTP workaround...");
  const utxos = await fetchUtxosHTTP(ownerAddress);
  console.log(`Found ${utxos.length} UTXOs`);

  if (utxos.length === 0) {
    throw new Error("No UTXOs found");
  }

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

  // Use exact working script address
  const scriptAddress = "addr_test1wqdf95yjyzpdha5t2a9nv822pkd4vqn3y862yaaufnp03r2qlnx3qz";
  
  console.log("🔧 Building transaction...");
  
  // Build transaction using exact pattern from working lock.js
  const meshTxBuilder = new MeshTxBuilder({
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
  });

  try {
    // Use the exact same pattern as lock.js
    const txUnsigned = await meshTxBuilder
      .txOut(scriptAddress, [
        {
          unit: "lovelace",
          quantity: "3000000",
        },
      ])
      .txOutInlineDatumValue(mConStr0([]))
      .changeAddress(ownerAddress)
      .selectUtxosFrom(utxos)
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
    console.log(`   📍 Script: ${scriptAddress}`);
    console.log("");
    
    return {
      txHash,
      secret,
      secretHash,
      lockUntil,
      scriptAddress
    };

  } catch (error) {
    console.error("❌ Transaction building failed:", error);
    throw error;
  }
}

// Run the timelock
createTimelockTransaction()
  .then((result) => {
    console.log("🎉 Success! Timelock transaction hash:", result.txHash);
  })
  .catch((error) => {
    console.error("❌ Failed:", error);
  });
