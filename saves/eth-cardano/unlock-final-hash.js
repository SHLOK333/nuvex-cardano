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

// HTTP UTXO fetcher
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
    const scriptOutput = data.outputs.find(output => output.address === scriptAddr);
    
    if (!scriptOutput) {
      throw new Error(`No UTXO found at script address ${scriptAddr}`);
    }
    
    console.log("🎯 Found script UTXO:", scriptOutput);
    
    return {
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
  } catch (error) {
    console.error("❌ Failed to fetch UTXO via HTTP:", error.message);
    throw error;
  }
}

// HTTP UTXO fetcher for wallet addresses
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
    console.log("💰 Found", data.length, "UTXOs for", address.substring(0, 20) + "...");
    
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

// Submit transaction via HTTP
async function submitTransactionHTTP(signedTxHex) {
  const apiKey = process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
  const url = "https://cardano-preprod.blockfrost.io/api/v0/tx/submit";
  
  try {
    console.log("📤 Submitting transaction via HTTP...");
    console.log("🔍 Transaction hex length:", signedTxHex.length);
    console.log("🔍 Transaction hex preview:", signedTxHex.substring(0, 100) + "...");
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'project_id': apiKey,
        'Content-Type': 'application/cbor'
      },
      body: Buffer.from(signedTxHex, 'hex')
    });
    
    const responseText = await response.text();
    console.log("📋 Response status:", response.status);
    console.log("📋 Response text:", responseText);
    
    if (!response.ok) {
      throw new Error(`Transaction submission failed: ${response.status} - ${responseText}`);
    }
    
    // The response should be the transaction hash
    if (responseText.length === 64 && /^[a-f0-9]+$/i.test(responseText)) {
      return responseText;
    } else {
      console.log("⚠️  Unexpected response format, but transaction may have been submitted");
      // Try to extract transaction hash from CBOR if possible
      return "Transaction submitted but hash format unexpected";
    }
    
  } catch (error) {
    console.error("❌ HTTP submission failed:", error.message);
    throw error;
  }
}

async function unlockWithDetails() {
  try {
    console.log("🔓 Starting ADA unlock with detailed logging...");
    
    // Our lock transaction hash
    const txHashFromDeposit = "cce7b8f3d8cb4e58a9065d817089f3d9e8bfe3c9b5ff0a07eb56f4c2c24f2b96";
    
    console.log("🔍 Looking for UTXO from transaction:", txHashFromDeposit);
    const vestingUtxo = await getUtxoByTxHashHTTP(txHashFromDeposit);
    
    // Get addresses
    const beneficiaryAddress = await beneficiary_wallet.getChangeAddress();
    const ownerAddress = await owner_wallet.getChangeAddress();
    
    console.log("👤 Beneficiary address:", beneficiaryAddress);
    console.log("👤 Owner address:", ownerAddress);
    
    // Get owner UTXOs for fees
    const ownerUtxos = await fetchUtxosHTTP(ownerAddress);
    if (!ownerUtxos || ownerUtxos.length === 0) {
      throw new Error("Owner wallet has no UTXOs for fees");
    }
    
    const collateralUtxo = ownerUtxos[0];
    console.log("🔒 Using collateral UTXO:", collateralUtxo.input.txHash);
    
    // Create transaction builder
    const blockfrostProvider = new BlockfrostProvider("preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5");
    const txBuilder = new MeshTxBuilder({
      fetcher: blockfrostProvider,
      submitter: blockfrostProvider,
      networkId: 0, // Testnet
    });
    
    const { pubKeyHash: ownerPubKeyHash } = deserializeAddress(ownerAddress);
    
    console.log("🔧 Building unlock transaction...");
    
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
    const completedTx = await txBuilder.complete();
    console.log("✅ Transaction built successfully!");
    console.log("📝 Transaction hex:", completedTx);
    
    console.log("🔐 Signing transaction...");
    const signedTx = await owner_wallet.signTx(completedTx);
    console.log("✅ Transaction signed!");
    console.log("📝 Signed transaction hex:", signedTx);
    
    // Try HTTP submission
    try {
      const txHash = await submitTransactionHTTP(signedTx);
      console.log("✅ Transaction Hash:", txHash);
      return txHash;
    } catch (httpError) {
      console.log("⚠️  HTTP submission failed, trying wallet submission...");
      
      // Fallback to wallet submission
      const txHash = await owner_wallet.submitTx(signedTx);
      console.log("✅ Transaction Hash (via wallet):", txHash);
      return txHash;
    }
    
  } catch (error) {
    console.error("❌ Error in unlock process:", error);
    throw error;
  }
}

unlockWithDetails()
  .then(hash => {
    console.log("🎉 Final transaction hash:", hash);
    console.log("📊 Atomic Swap Status: COMPLETED ✅");
  })
  .catch(console.error);
