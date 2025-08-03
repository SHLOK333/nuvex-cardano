import dotenv from "dotenv";
import { mConStr0 } from "@meshsdk/common";
import { deserializeAddress } from "@meshsdk/core";
import {
  getTxBuilder,
  owner_wallet,
  beneficiary_wallet,
  scriptAddr,
} from "./common.js";

// Load environment from parent directory
dotenv.config({ path: "../.env" });

// Direct HTTP UTXO fetcher to work around MeshSDK bug
async function fetchUtxosHTTP(address) {
  const apiKey = process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
  const url = `https://cardano-preprod.blockfrost.io/api/v0/addresses/${address}/utxos`;
  
  try {
    const response = await fetch(url, {
      headers: { 'project_id': apiKey }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Convert Blockfrost format to MeshSDK format
    return data.map(utxo => ({
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

async function depositFundTx(amount, lockUntilTimeStampMs) {
  console.log("🔒 Creating deposit transaction...");
  
  // Get owner address
  const ownerAddress = await owner_wallet.getChangeAddress();
  console.log("Owner address:", ownerAddress);
  
  // Use workaround to get UTXOs
  console.log("Fetching UTXOs with HTTP workaround...");
  const utxos = await fetchUtxosHTTP(ownerAddress);
  console.log(`Found ${utxos.length} UTXOs`);
  
  if (utxos.length === 0) {
    throw new Error("No UTXOs found in owner wallet");
  }
  
  // Show first UTXO
  if (utxos.length > 0) {
    const firstUtxo = utxos[0];
    const lovelaceAmount = firstUtxo.output.amount.find(a => a.unit === "lovelace");
    console.log(`First UTXO: ${parseInt(lovelaceAmount.quantity) / 1000000} ADA`);
  }

  const txBuilder = getTxBuilder();
  await txBuilder
    .txOut(scriptAddr, amount)
    .txOutInlineDatumValue(mConStr0([]))
    .changeAddress(ownerAddress)
    .selectUtxosFrom(utxos)
    .complete();
  
  console.log("✅ Transaction built successfully");
  return txBuilder.txHex;
}

async function main() {
  const assets = [
    {
      unit: "lovelace",
      quantity: "3000000",
    },
  ];

  const unsignedTx = await depositFundTx(assets);
  const signedTx = await owner_wallet.signTx(unsignedTx);
  const txHash = await owner_wallet.submitTx(signedTx);
  console.log("Transaction submitted:", txHash);
}

main().catch(console.error);
