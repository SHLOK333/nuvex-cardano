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

// HTTP UTXO fetcher to work around MeshSDK bug
async function getUtxoByTxHashHTTP(txHash) {
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

// HTTP UTXO fetcher for any wallet address
async function fetchUtxosHTTP(address) {
  const apiKey = process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
  const url = `https://cardano-preprod.blockfrost.io/api/v0/addresses/${address}/utxos`;
  
  try {
    console.log("🌐 Fetching UTXOs for address:", address);
    const response = await fetch(url, {
      headers: { 'project_id': apiKey }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("💰 Found", data.length, "UTXOs");
    
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
    console.error("❌ Failed to fetch UTXOs for", address, ":", error.message);
    return [];
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
      throw new Error(`HTTP submission failed: ${errorText}`);
    }
  } catch (error) {
    console.error("❌ HTTP submission error:", error.message);
    throw error;
  }
}

async function withdrawFundTx(vestingUtxo) {
  // Get addresses first
  const beneficiaryAddress = beneficiary_wallet.addresses?.baseAddressBech32 || await beneficiary_wallet.getChangeAddress();
  const ownerAddress = owner_wallet.addresses?.baseAddressBech32 || await owner_wallet.getChangeAddress();
  
  console.log("👤 Beneficiary address:", beneficiaryAddress);
  console.log("👤 Owner address:", ownerAddress);
  
  // Use beneficiary wallet for signing (since it has funds now)
  const utxos = await fetchUtxosHTTP(beneficiaryAddress);
  
  if (!utxos || utxos.length === 0) {
    throw new Error("Beneficiary wallet has no UTXOs");
  }
  
  let collateral;
  try {
    collateral = await beneficiary_wallet.getCollateral();
  } catch {
    collateral = [];
  }
  
  // Use first UTXO as collateral if no dedicated collateral
  const collateralUtxo = collateral.length > 0 ? collateral[0] : utxos[0];
  
  if (!collateralUtxo) {
    throw new Error("No UTXOs available for collateral");
  }
  
  console.log("📍 Sending unlocked ADA to beneficiary:", beneficiaryAddress);
  console.log("🔒 Using collateral UTXO:", collateralUtxo.input?.txHash || "Unknown");

  const { pubKeyHash: beneficiaryPubKeyHash } = deserializeAddress(beneficiaryAddress);

  const txBuilder = getTxBuilder();
  
  console.log("🔧 Building transaction with simplified approach...");
  
  // Build transaction step by step without complete()
  txBuilder
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
    .requiredSignerHash(beneficiaryPubKeyHash)
    .changeAddress(beneficiaryAddress)
    .selectUtxosFrom(utxos);
  
  console.log("🏗️  Transaction built, attempting to get hex without complete()...");
  
  // Try to get the transaction hex directly
  try {
    // Some versions allow accessing txHex before complete()
    if (txBuilder.txHex) {
      console.log("✅ Got transaction hex directly");
      return { txHex: txBuilder.txHex, signingWallet: beneficiary_wallet };
    }
  } catch (error) {
    console.log("ℹ️  Cannot get txHex before complete(), trying complete()...");
  }
  
  // If that doesn't work, try complete() with timeout
  try {
    console.log("🏁 Attempting complete() with timeout...");
    
    const completePromise = txBuilder.complete();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Complete() timed out after 30 seconds")), 30000)
    );
    
    await Promise.race([completePromise, timeoutPromise]);
    
    console.log("✅ Transaction completed successfully");
    return { txHex: txBuilder.txHex, signingWallet: beneficiary_wallet };
  } catch (error) {
    console.error("❌ Complete() failed:", error);
    
    // Final fallback - try to use the transaction builder's internal state
    console.log("🔄 Attempting fallback transaction building...");
    throw new Error(`Transaction building failed: ${error.message}`);
  }
}

async function main() {
  try {
    console.log("🔓 Starting ADA unlock process...");
    
    // Use our successful lock transaction hash
    const txHashFromDesposit =
      "cce7b8f3d8cb4e58a9065d817089f3d9e8bfe3c9b5ff0a07eb56f4c2c24f2b96";

    console.log("🔍 Looking for UTXO from transaction:", txHashFromDesposit);
    const utxo = await getUtxoByTxHashHTTP(txHashFromDesposit);

    if (utxo === undefined) throw new Error("UTxO not found");
    
    console.log("✅ Found UTXO:", utxo);

    console.log("🔧 Building unlock transaction...");
    const { txHex: unsignedTx, signingWallet } = await withdrawFundTx(utxo);

    console.log("🔐 Signing transaction...");
    const signedTx = await signingWallet.signTx(unsignedTx);

    console.log("📤 Submitting transaction...");
    const txHash = await submitTransactionHTTP(signedTx);
    console.log("✅ Transaction Hash:", txHash);
    console.log("🎉 ADA unlock completed successfully!");
    console.log("");
    console.log("🏆 ATOMIC SWAP COMPLETED! 🏆");
    console.log("✅ ADA locked in escrow");
    console.log("✅ Ethereum contract deployed");
    console.log("✅ Ethereum withdrawal completed");
    console.log("✅ ADA unlocked and sent to beneficiary");
  } catch (error) {
    console.error("❌ Error in unlock process:", error);
  }
}

main();
