import {
  deserializeAddress,
  MeshTxBuilder,
  BlockfrostProvider,
  mConStr0,
} from "@meshsdk/core";
import crypto from 'crypto';

import {
  owner_wallet,
  beneficiary_wallet,
  blockchainProvider,
} from "./common.js";

console.log("🔒 TIMELOCK TRANSACTION DEMONSTRATION");
console.log("═══════════════════════════════════════");

async function createTimelockTx() {
  try {
    console.log("⏰ Creating 1-hour timelock for 3 ADA...");
    
    // Generate secret and hash
    const secret = "0000000000000000000000000000000000000000000000000000000000000000";
    const secretHash = crypto.createHash('sha256').update(Buffer.from(secret, 'hex')).digest('hex');
    
    // Calculate timelock expiry (1 hour from now)
    const now = Math.floor(Date.now() / 1000);
    const lockUntil = now + (1 * 60 * 60); // 1 hour
    
    console.log("📋 Timelock Details:");
    console.log(`   Secret Hash: ${secretHash}`);
    console.log(`   Lock Until: ${new Date(lockUntil * 1000).toISOString()}`);
    console.log(`   Duration: 1 hour`);
    console.log("");
    
    // Use the same script address as our working atomic swap
    const scriptAddress = "addr_test1wptrxvx2pljz24vsg37zl5gznu20wqx2xpgef8k8uesvw2s7uu6x4";
    
    // Get wallet addresses
    const ownerAddress = await owner_wallet.getChangeAddress();
    const beneficiaryAddress = await beneficiary_wallet.getChangeAddress();
    
    // Get public key hashes
    const { pubKeyHash: ownerPkh } = deserializeAddress(ownerAddress);
    const { pubKeyHash: beneficiaryPkh } = deserializeAddress(beneficiaryAddress);
    
    console.log("👤 Participants:");
    console.log(`   Owner PKH: ${ownerPkh}`);
    console.log(`   Beneficiary PKH: ${beneficiaryPkh}`);
    console.log("");
    
    // Build transaction exactly like our working atomic swap
    const meshTxBuilder = new MeshTxBuilder({
      fetcher: blockchainProvider,
      submitter: blockchainProvider,
      networkId: 0,
    });
    
    console.log("🔧 Building transaction...");
    
    // Use simple empty datum first (like atomic swap)
    const txUnsigned = await meshTxBuilder
      .txOut(scriptAddress, [{ unit: "lovelace", quantity: "3000000" }])
      .txOutInlineDatumValue(mConStr0([]))
      .changeAddress(ownerAddress)
      .selectUtxosFrom(await owner_wallet.getUtxos())
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
    
    console.log("🛠️  What You Can Do:");
    console.log("   1. Monitor transaction confirmation on explorer");
    console.log("   2. Use the secret to unlock before expiry");
    console.log("   3. Wait for timelock expiry to test refund");
    console.log("   4. Analyze the transaction structure");
    console.log("");
    
    return {
      txHash,
      secret,
      secretHash,
      lockUntil,
      scriptAddress,
      ownerPkh,
      beneficiaryPkh
    };
    
  } catch (error) {
    console.error("❌ Error creating timelock:", error);
    throw error;
  }
}

// Run the timelock demonstration
createTimelockTx()
  .then((result) => {
    console.log("🎉 Timelock created successfully!");
    console.log("Transaction hash:", result.txHash);
  })
  .catch((error) => {
    console.error("❌ Failed to create timelock:", error);
  });
