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

async function withdrawFundTx(vestingUtxo) {
  // Get addresses first
  const beneficiaryAddress = beneficiary_wallet.addresses?.baseAddressBech32 || await beneficiary_wallet.getChangeAddress();
  const ownerAddress = owner_wallet.addresses?.baseAddressBech32 || await owner_wallet.getChangeAddress();
  
  console.log("👤 Beneficiary address:", beneficiaryAddress);
  console.log("👤 Owner address:", ownerAddress);
  
  // Try to use beneficiary wallet first, fallback to owner wallet for fees
  let utxos, collateral, payingWallet, signerAddress;
  
  try {
    // Try beneficiary wallet first using HTTP
    utxos = await fetchUtxosHTTP(beneficiaryAddress);
    
    // Check if beneficiary actually has UTXOs
    if (!utxos || utxos.length === 0) {
      throw new Error("Beneficiary wallet has no UTXOs");
    }
    
    try {
      collateral = await beneficiary_wallet.getCollateral();
    } catch {
      collateral = [];
    }
    
    payingWallet = beneficiary_wallet;
    signerAddress = beneficiaryAddress;
    console.log("💰 Using beneficiary wallet for fees");
  } catch (error) {
    // Fallback to owner wallet if beneficiary has no funds
    console.log("⚠️  Beneficiary wallet has no funds, using owner wallet for fees");
    console.log("   Reason:", error.message);
    
    utxos = await fetchUtxosHTTP(ownerAddress);
    
    if (!utxos || utxos.length === 0) {
      throw new Error("Owner wallet also has no UTXOs available");
    }
    
    try {
      collateral = await owner_wallet.getCollateral();
    } catch {
      collateral = [];
    }
    payingWallet = owner_wallet;
    signerAddress = ownerAddress;
  }
  
  // Use first UTXO as collateral if no dedicated collateral
  const collateralUtxo = collateral.length > 0 ? collateral[0] : utxos[0];
  
  if (!collateralUtxo) {
    throw new Error("No UTXOs available for collateral");
  }
  
  console.log("📍 Sending unlocked ADA to beneficiary:", beneficiaryAddress);
  console.log("📍 Paying fees from:", signerAddress);
  console.log("🔒 Using collateral UTXO:", collateralUtxo.input?.txHash || "Unknown");

  const { pubKeyHash: signerPubKeyHash } = deserializeAddress(signerAddress);

  const txBuilder = getTxBuilder();
  
  try {
    console.log("🔧 Building transaction with components:");
    console.log("   Script input:", vestingUtxo.input.txHash, "index", vestingUtxo.input.outputIndex);
    console.log("   Script address:", scriptAddr);
    console.log("   Output to:", beneficiaryAddress);
    console.log("   Amount:", vestingUtxo.output.amount);
    console.log("   Collateral:", collateralUtxo.input.txHash);
    console.log("   Signer:", signerPubKeyHash);
    
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
      .requiredSignerHash(signerPubKeyHash)
      .changeAddress(signerAddress)
      .selectUtxosFrom(utxos);
    
    console.log("🏁 Calling complete()...");
    
    // Wrap complete() in a more specific try-catch
    try {
      await txBuilder.complete();
      console.log("✅ Transaction completed successfully");
    } catch (completeError) {
      console.error("❌ Complete() failed with error:", completeError);
      console.error("Error type:", typeof completeError);
      console.error("Error constructor:", completeError?.constructor?.name);
      console.error("Error string representation:", String(completeError));
      console.error("Error JSON:", JSON.stringify(completeError, null, 2));
      
      // Try to extract more details
      if (completeError && typeof completeError === 'object') {
        console.error("Error keys:", Object.keys(completeError));
        for (const [key, value] of Object.entries(completeError)) {
          console.error(`  ${key}:`, value);
        }
      }
      
      throw new Error(`Transaction complete() failed: ${String(completeError)}`);
    }
    
    return { txHex: txBuilder.txHex, signingWallet: payingWallet };
  } catch (buildError) {
    console.error("❌ Transaction building failed:", buildError);
    throw buildError;
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
    const txHash = await signingWallet.submitTx(signedTx);
    console.log("✅ Transaction Hash:", txHash);
    console.log("🎉 ADA unlock completed successfully!");
  } catch (error) {
    console.error("❌ Error in unlock process:", error);
  }
}

// Fallback function using MeshSDK (keep for compatibility)
async function getUtxoByTxHash(txHash) {
  const utxos = await blockchainProvider.fetchUTxOs(txHash);
  if (utxos.length === 0) {
    throw new Error("UTxO not found");
  }
  return utxos[0];
}

main();
