import {
  deserializeAddress,
  deserializeDatum,
  unixTimeToEnclosingSlot,
  SLOT_CONFIG_NETWORK,
} from "@meshsdk/core";

import {
  getTxBuilder,
  owner_wallet,
  beneficiary_wallet,
  scriptAddr,
  scriptCbor,
  blockchainProvider,
} from "./common.js";
import { mConStr0 } from "@meshsdk/common";
import dotenv from "dotenv";

// Load environment from parent directory
dotenv.config({ path: "../.env" });

// Direct HTTP UTXO fetcher to work around MeshSDK bug
async function fetchUtxoByTxHashHTTP(txHash) {
  const apiKey = process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
  const url = `https://cardano-preprod.blockfrost.io/api/v0/txs/${txHash}/utxos`;
  
  try {
    console.log("🌐 Fetching UTXO via HTTP from Blockfrost...");
    const response = await fetch(url, {
      headers: { 'project_id': apiKey }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("📦 Raw UTXO data:", JSON.stringify(data, null, 2));
    
    // Find the output sent to the script address
    const scriptOutput = data.outputs.find(output => output.address === scriptAddr);
    
    if (!scriptOutput) {
      throw new Error(`No UTXO found at script address ${scriptAddr}`);
    }
    
    console.log("🎯 Found script UTXO:", scriptOutput);
    
    // Convert to MeshSDK format
    const utxo = {
      input: {
        outputIndex: scriptOutput.output_index,
        txHash: txHash,
      },
      output: {
        address: scriptOutput.address,
        amount: scriptOutput.amount,
        dataHash: scriptOutput.data_hash,
        plutusData: scriptOutput.inline_datum,
        scriptRef: scriptOutput.reference_script_hash,
      },
    };
    
    return utxo;
  } catch (error) {
    console.error("❌ Failed to fetch UTXO via HTTP:", error.message);
    throw error;
  }
}

// HTTP UTXO fetcher for owner wallet (who will pay fees)
async function fetchOwnerUtxosHTTP() {
  const ownerAddress = owner_wallet.addresses?.baseAddressBech32 || await owner_wallet.getChangeAddress();
  const apiKey = process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
  const url = `https://cardano-preprod.blockfrost.io/api/v0/addresses/${ownerAddress}/utxos`;
  
  try {
    console.log("🌐 Fetching owner UTXOs via HTTP...");
    console.log("📍 Owner address:", ownerAddress);
    const response = await fetch(url, {
      headers: { 'project_id': apiKey }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("💰 Found", data.length, "UTXOs for owner");
    
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
    console.error("❌ Failed to fetch owner UTXOs:", error.message);
    return [];
  }
}

async function withdrawFundTx(vestingUtxo) {
  // Use owner wallet UTXOs to pay for fees (since beneficiary has no funds)
  const utxos = await fetchOwnerUtxosHTTP();
  console.log("💰 Owner has", utxos.length, "UTXOs for fees");
  
  if (utxos.length === 0) {
    throw new Error("Owner wallet has no UTXOs for fees and collateral");
  }
  
  // Send unlocked funds to beneficiary, but owner pays fees
  const beneficiaryAddress = beneficiary_wallet.addresses?.baseAddressBech32 || await beneficiary_wallet.getChangeAddress();
  const ownerAddress = owner_wallet.addresses?.baseAddressBech32 || await owner_wallet.getChangeAddress();
  
  console.log("📍 Sending unlocked ADA to beneficiary:", beneficiaryAddress);
  console.log("📍 Owner paying fees from:", ownerAddress);
  
  // Try to get collateral, but handle if none exists
  let collateral;
  try {
    collateral = await owner_wallet.getCollateral();
  } catch (error) {
    console.log("⚠️  No collateral found, using regular UTXO for collateral");
    collateral = [];
  }
  
  // Use the first available UTXO as collateral if no dedicated collateral exists
  const collateralUtxo = collateral.length > 0 ? collateral[0] : utxos[0];
  
  if (!collateralUtxo) {
    throw new Error("No UTXOs available for collateral");
  }
  
  console.log("🔒 Using collateral UTXO:", collateralUtxo);

  const { pubKeyHash: ownerPubKeyHash } = deserializeAddress(ownerAddress);

  const txBuilder = getTxBuilder();
  
  // Debug transaction builder configuration
  console.log("🔧 Transaction builder configuration:");
  console.log("Network ID in builder:", txBuilder.networkId);
  console.log("Fetcher network:", txBuilder.fetcher?.network);
  
  try {
    console.log("🔨 Starting transaction builder...");
    
    // Explicitly set the transaction to use testnet
    console.log("🌐 Setting transaction for testnet...");
    
    await txBuilder
      .spendingPlutusScript("V3")
      .txIn(
        vestingUtxo.input.txHash,
        vestingUtxo.input.outputIndex,
        vestingUtxo.output.amount,
        scriptAddr,
      )
      .spendingReferenceTxInInlineDatumPresent()
      .spendingReferenceTxInRedeemerValue(
        "0000000000000000000000000000000000000000000000000000000000000000",
      )
      .txInScript(scriptCbor)
      .txOut(beneficiaryAddress, vestingUtxo.output.amount)
      .txInCollateral(
        collateralUtxo.input.txHash,
        collateralUtxo.input.outputIndex,
        collateralUtxo.output.amount,
        collateralUtxo.output.address,
      )
      .requiredSignerHash(ownerPubKeyHash)
      .changeAddress(ownerAddress)
      .selectUtxosFrom(utxos);
    
    console.log("🏁 Calling complete()...");
    
    // Try to force testnet before completion
    if (txBuilder.meshTxBuilderBody) {
      console.log("🔧 Setting meshTxBuilderBody network to testnet");
      txBuilder.meshTxBuilderBody.network = "testnet";
    }
    
    await txBuilder.complete();
    
    console.log("✅ Transaction building completed successfully");
    return txBuilder.txHex;
  } catch (buildError) {
    console.error("❌ Transaction building failed:");
    
    // Handle empty object error specifically
    if (typeof buildError === 'object' && Object.keys(buildError).length === 0) {
      console.error("Got empty error object - this is likely a MeshSDK internal error");
      console.error("Possible causes:");
      console.error("1. Network mismatch (testnet vs mainnet)");
      console.error("2. Insufficient UTXOs for transaction fees");
      console.error("3. Script validation failure");
      console.error("4. Invalid transaction structure");
      
      throw new Error("Transaction building failed with empty error - check logs above for details");
    }
    
    console.error("Build error type:", typeof buildError);
    console.error("Build error details:", {
      message: buildError.message,
      stack: buildError.stack,
      name: buildError.name,
      cause: buildError.cause,
      constructor: buildError.constructor?.name
    });
    throw buildError;
  }
}

// Custom transaction submission function
async function submitTransactionHTTP(signedTxHex) {
  const apiKey = process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
  const url = "https://cardano-preprod.blockfrost.io/api/v0/tx/submit";
  
  try {
    console.log("📤 Submitting transaction to Blockfrost...");
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'project_id': apiKey,
        'Content-Type': 'application/cbor'
      },
      body: Buffer.from(signedTxHex, 'hex')
    });
    
    console.log("Response status:", response.status);
    
    if (response.ok) {
      const txHash = await response.text();
      console.log("✅ Transaction submitted successfully!");
      return txHash.replace(/"/g, ''); // Remove quotes if present
    } else {
      const errorText = await response.text();
      console.error("❌ Submission failed:", errorText);
      
      // Try alternative submission method
      console.log("🔄 Trying MeshSDK submission...");
      return await submitWithMeshSDK(signedTxHex);
    }
  } catch (error) {
    console.error("❌ HTTP submission error:", error.message);
    
    // Fallback to MeshSDK submission
    console.log("🔄 Falling back to MeshSDK submission...");
    return await submitWithMeshSDK(signedTxHex);
  }
}

// Fallback MeshSDK submission
async function submitWithMeshSDK(signedTxHex) {
  try {
    const txHash = await owner_wallet.submitTx(signedTxHex);
    
    // Check if we got HTML instead of hash
    if (txHash.includes('<!DOCTYPE html>')) {
      throw new Error("Got HTML response instead of transaction hash");
    }
    
    return txHash;
  } catch (error) {
    console.error("❌ MeshSDK submission also failed:", error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log("🔓 Starting ADA unlock process...");
    
    // Debug network and wallet configuration
    console.log("🔍 Checking network configuration...");
    console.log("Owner wallet networkId:", owner_wallet.networkId);
    console.log("Beneficiary wallet networkId:", beneficiary_wallet.networkId);
    console.log("Blockchain provider network:", blockchainProvider.network);
    
    // Check wallet addresses
    const ownerAddress = await owner_wallet.getChangeAddress();
    const beneficiaryAddress = await beneficiary_wallet.getChangeAddress();
    console.log("👤 Owner address:", ownerAddress);
    console.log("👤 Beneficiary address:", beneficiaryAddress);
    console.log("📜 Script address:", scriptAddr);
    
    const txHashFromDesposit =
      "cce7b8f3d8cb4e58a9065d817089f3d9e8bfe3c9b5ff0a07eb56f4c2c24f2b96";
    
    console.log("🔍 Looking for UTXO from transaction:", txHashFromDesposit);

    const utxo = await fetchUtxoByTxHashHTTP(txHashFromDesposit);

    if (utxo === undefined) throw new Error("UTxO not found");
    
    console.log("✅ Found UTXO:", utxo);
    console.log("🔧 Building unlock transaction...");

    const unsignedTx = await withdrawFundTx(utxo);
    
    console.log("🔐 Signing transaction...");
    const signedTx = await owner_wallet.signTx(unsignedTx);
    
    console.log("📤 Submitting transaction...");
    const txHash = await submitTransactionHTTP(signedTx);
    console.log("✅ Transaction Hash:", txHash);
  } catch (error) {
    console.error("❌ Error in unlock process:");
    console.error("Error message:", error.message || "No message");
    console.error("Error name:", error.name || "No name");
    console.error("Error type:", typeof error);
    console.error("Error object:", error);
    console.error("Stack trace:", error.stack || "No stack trace");
    
    // Try to extract more details if it's a wrapped error
    if (error.cause) {
      console.error("Error cause:", error.cause);
    }
    if (error.details) {
      console.error("Error details:", error.details);
    }
  }
}

async function getUtxoByTxHash(txHash) {
  const utxos = await blockchainProvider.fetchUTxOs(txHash);
  if (utxos.length === 0) {
    throw new Error("UTxO not found");
  }
  return utxos[0];
}

main();
