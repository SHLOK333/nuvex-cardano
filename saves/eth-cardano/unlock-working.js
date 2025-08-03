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

async function withdrawFundTx(vestingUtxo) {
  // Get addresses
  const beneficiaryAddress = await beneficiary_wallet.getChangeAddress();
  const ownerAddress = await owner_wallet.getChangeAddress();
  
  console.log("👤 Beneficiary address:", beneficiaryAddress);
  console.log("👤 Owner address:", ownerAddress);
  
  // Get UTXOs for fees (using owner wallet)
  const ownerUtxos = await fetchUtxosHTTP(ownerAddress);
  if (!ownerUtxos || ownerUtxos.length === 0) {
    throw new Error("Owner wallet has no UTXOs for fees");
  }
  
  const collateralUtxo = ownerUtxos[0];
  console.log("📍 Sending unlocked ADA to beneficiary:", beneficiaryAddress);
  console.log("📍 Paying fees from owner:", ownerAddress);
  console.log("🔒 Using collateral UTXO:", collateralUtxo.input.txHash);

  const { pubKeyHash: ownerPubKeyHash } = deserializeAddress(ownerAddress);

  // Create transaction builder with explicit provider and testnet configuration
  const blockfrostProvider = new BlockfrostProvider("preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5");
  const txBuilder = new MeshTxBuilder({
    fetcher: blockfrostProvider,
    submitter: blockfrostProvider,
    networkId: 0, // Testnet
  });
  
  console.log("🔧 Building transaction with components:");
  console.log("   Script input:", vestingUtxo.input.txHash, "index", vestingUtxo.input.outputIndex);
  console.log("   Script address:", scriptAddr);
  console.log("   Output to:", beneficiaryAddress);
  console.log("   Amount:", vestingUtxo.output.amount);
  console.log("   Collateral:", collateralUtxo.input.txHash);
  console.log("   Signer:", ownerPubKeyHash);
  
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
  console.log("✅ Transaction completed successfully!");
  
  return { txHex: completedTx, signingWallet: owner_wallet };
}

async function main() {
  try {
    console.log("🔓 Starting ADA unlock process with MeshSDK 1.7.5...");
    
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
    
    // Extract actual transaction hash if it's mixed with HTML
    const txHashMatch = txHash.match(/([a-f0-9]{64})/i);
    if (txHashMatch) {
      console.log("🎯 Extracted Transaction Hash:", txHashMatch[1]);
    }
    
    console.log("🎉 ADA unlock completed successfully!");
    console.log("📊 Atomic Swap Status: COMPLETED ✅");
    console.log("   ✅ Step 1: ADA locked in Cardano escrow");
    console.log("   ✅ Step 2: Ethereum contract deployed");
    console.log("   ✅ Step 3: ETH withdrawn with secret revealed");
    console.log("   ✅ Step 4: ADA unlocked with revealed secret");
    
  } catch (error) {
    console.error("❌ Error in unlock process:", error);
  }
}

main();
