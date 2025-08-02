import {
  deserializeAddress,
  MeshTxBuilder,
  BlockfrostProvider,
} from "@meshsdk/core";

import {
  owner_wallet,
  beneficiary_wallet,
  scriptAddr,
  scriptCbor,
} from "./common.js";

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

async function testUnlock() {
  try {
    console.log("🔓 Testing unlock with MeshSDK version 1.7.5...");
    
    // Get the transaction hash from our successful lock
    const txHashFromDesposit = "cce7b8f3d8cb4e58a9065d817089f3d9e8bfe3c9b5ff0a07eb56f4c2c24f2b96";
    
    console.log("🔍 Looking for UTXO from transaction:", txHashFromDesposit);
    const vestingUtxo = await getUtxoByTxHashHTTP(txHashFromDesposit);
    
    if (!vestingUtxo) throw new Error("UTxO not found");
    console.log("✅ Found UTXO:", vestingUtxo);
    
    // Get addresses
    const beneficiaryAddress = await beneficiary_wallet.getChangeAddress();
    const ownerAddress = await owner_wallet.getChangeAddress();
    
    console.log("👤 Beneficiary address:", beneficiaryAddress);
    console.log("👤 Owner address:", ownerAddress);
    
    // Get UTXOs for fees
    const ownerUtxos = await fetchUtxosHTTP(ownerAddress);
    if (!ownerUtxos || ownerUtxos.length === 0) {
      throw new Error("Owner wallet has no UTXOs for fees");
    }
    
    const collateralUtxo = ownerUtxos[0];
    console.log("🔒 Using collateral UTXO:", collateralUtxo.input.txHash);
    
    // Create transaction builder with explicit provider
    const blockfrostProvider = new BlockfrostProvider("preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5");
    const txBuilder = new MeshTxBuilder({
      fetcher: blockfrostProvider,
      submitter: blockfrostProvider,
      networkId: 0, // Testnet
    });
    
    const { pubKeyHash: ownerPubKeyHash } = deserializeAddress(ownerAddress);
    
    console.log("🔧 Building transaction...");
    console.log("   Script input:", vestingUtxo.input.txHash, "index", vestingUtxo.input.outputIndex);
    console.log("   Amount:", vestingUtxo.output.amount);
    console.log("   Collateral:", collateralUtxo.input.txHash);
    console.log("   Signer:", ownerPubKeyHash);
    
    // Build the transaction step by step
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
      .requiredSignerHash(ownerPubKeyHash)
      .changeAddress(ownerAddress)
      .selectUtxosFrom(ownerUtxos);
    
    console.log("🏁 Calling complete()...");
    
    // Try the complete() method with more detailed error handling
    try {
      const completedTx = await txBuilder.complete();
      console.log("✅ Transaction completed successfully!");
      console.log("Transaction hex:", completedTx);
      
      // Try to sign and submit
      console.log("🔐 Signing transaction...");
      const signedTx = await owner_wallet.signTx(completedTx);
      
      console.log("📤 Submitting transaction...");
      const txHash = await owner_wallet.submitTx(signedTx);
      console.log("✅ Transaction Hash:", txHash);
      console.log("🎉 ADA unlock completed successfully!");
      
    } catch (completeError) {
      console.error("❌ Complete() failed with error:", completeError);
      console.error("Error type:", typeof completeError);
      console.error("Error constructor:", completeError?.constructor?.name);
      console.error("Error message:", completeError?.message);
      console.error("Error stack:", completeError?.stack);
      
      // Try to get transaction builder state
      console.log("🔍 Checking transaction builder state...");
      console.log("Builder methods available:", Object.getOwnPropertyNames(txBuilder).filter(name => typeof txBuilder[name] === 'function'));
      
      throw completeError;
    }
    
  } catch (error) {
    console.error("❌ Error in unlock test:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      type: typeof error,
    });
  }
}

testUnlock();
