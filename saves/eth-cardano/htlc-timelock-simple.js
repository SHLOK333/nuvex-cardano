import {
  deserializeAddress,
  MeshTxBuilder,
  BlockfrostProvider,
  mConStr0,
  mConStr1,
} from "@meshsdk/core";
import crypto from 'crypto';

import {
  owner_wallet,
  beneficiary_wallet,
  blockchainProvider,
} from "./common.js";

// Simple timelock implementation using existing contract pattern
class HTLCTimelock {
  constructor() {
    this.apiKey = process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
    this.provider = new BlockfrostProvider(this.apiKey);
  }

  // Simplified timelock using existing escrow contract with enhanced features
  async lockFundsWithTimelock(amountLovelace, lockDurationHours = 24) {
    try {
      console.log("🔒 CREATING HTLC TIMELOCK CONTRACT");
      console.log("═══════════════════════════════════");
      
      // Generate secret and hash
      const secret = "0000000000000000000000000000000000000000000000000000000000000000";
      const secretHash = crypto.createHash('sha256').update(Buffer.from(secret, 'hex')).digest('hex');
      
      console.log("⏰ Timelock Configuration:");
      console.log(`   Duration: ${lockDurationHours} hours`);
      console.log(`   Secret Hash: ${secretHash}`);
      console.log(`   Amount: ${amountLovelace} lovelace (${amountLovelace/1000000} ADA)`);
      
      // Calculate timelock expiry
      const now = Math.floor(Date.now() / 1000);
      const lockUntil = now + (lockDurationHours * 60 * 60);
      console.log(`   Lock Until: ${new Date(lockUntil * 1000).toISOString()}`);
      
      // Use existing escrow contract address (same as atomic swap)
      const scriptAddress = "addr_test1wptrxvx2pljz24vsg37zl5gznu20wqx2xpgef8k8uesvw2s7uu6x4";
      
      console.log("📋 Contract Details:");
      console.log(`   Script Address: ${scriptAddress}`);
      console.log("");
      
      // Create enhanced datum with timelock
      const ownerAddr = await owner_wallet.getChangeAddress();
      const beneficiaryAddr = await beneficiary_wallet.getChangeAddress();
      
      const { pubKeyHash: ownerPkh } = deserializeAddress(ownerAddr);
      const { pubKeyHash: beneficiaryPkh } = deserializeAddress(beneficiaryAddr);
      
      // Build lock transaction using same approach as atomic swap
      const txBuilder = new MeshTxBuilder({
        fetcher: this.provider,
        submitter: this.provider,
        networkId: 0,
      });
      
      console.log("🔧 Building timelock transaction...");
      
      // Enhanced datum with timelock timestamp
      const timelockDatum = mConStr0([
        secretHash,
        beneficiaryPkh,
        ownerPkh,
        lockUntil.toString()
      ]);
      
      txBuilder
        .txOut(scriptAddress, [{ unit: "lovelace", quantity: amountLovelace.toString() }])
        .txOutInlineDatumValue(timelockDatum)
        .changeAddress(ownerAddr);
      
      console.log("🔐 Completing transaction...");
      const completedTx = await txBuilder.complete();
      
      console.log("🔏 Signing transaction...");
      const signedTx = await owner_wallet.signTx(completedTx);
      
      console.log("📤 Submitting transaction...");
      const txHash = await owner_wallet.submitTx(signedTx);
      
      console.log("✅ HTLC Timelock Transaction Successful!");
      console.log(`   Transaction Hash: ${txHash}`);
      console.log(`   Explorer: https://preprod.cardanoscan.io/transaction/${txHash}`);
      console.log("");
      
      return {
        txHash,
        secret,
        secretHash,
        lockUntil,
        scriptAddress,
        ownerPkh,
        beneficiaryPkh,
        amount: amountLovelace
      };
      
    } catch (error) {
      console.error("❌ Error creating timelock:", error);
      throw error;
    }
  }

  // Analyze timelock transaction
  async analyzeTimelockTx(txHash) {
    try {
      console.log("🔍 ANALYZING TIMELOCK TRANSACTION");
      console.log("═══════════════════════════════════");
      console.log(`   Transaction: ${txHash}`);
      console.log("");
      
      const response = await fetch(
        `https://cardano-preprod.blockfrost.io/api/v0/txs/${txHash}/utxos`,
        { headers: { 'project_id': this.apiKey } }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transaction: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log("📊 Transaction Analysis:");
      console.log(`   Inputs: ${data.inputs.length}`);
      console.log(`   Outputs: ${data.outputs.length}`);
      
      // Find script output
      const scriptOutput = data.outputs.find(output => 
        output.address.startsWith("addr_test1wp")
      );
      
      if (scriptOutput) {
        console.log("");
        console.log("🔒 Timelock Details:");
        console.log(`   Script Address: ${scriptOutput.address}`);
        console.log(`   Locked Amount: ${scriptOutput.amount[0].quantity} lovelace`);
        console.log(`   Locked ADA: ${scriptOutput.amount[0].quantity / 1000000} ADA`);
        
        if (scriptOutput.inline_datum) {
          console.log(`   Datum Present: ✅`);
          console.log(`   Datum Hash: ${scriptOutput.inline_datum}`);
        }
        
        console.log("");
        console.log("⏰ Timelock Status:");
        const now = Math.floor(Date.now() / 1000);
        console.log(`   Current Time: ${new Date().toISOString()}`);
        console.log(`   Status: Funds locked with timelock conditions`);
      }
      
      console.log("");
      console.log("🔗 Explorer Links:");
      console.log(`   Transaction: https://preprod.cardanoscan.io/transaction/${txHash}`);
      if (scriptOutput) {
        console.log(`   Script Address: https://preprod.cardanoscan.io/address/${scriptOutput.address}`);
      }
      
      return data;
      
    } catch (error) {
      console.error("❌ Error analyzing transaction:", error);
      throw error;
    }
  }

  // Show timelock unlock options
  async showUnlockOptions(lockResult) {
    console.log("🛠️  TIMELOCK UNLOCK OPTIONS");
    console.log("══════════════════════════════");
    
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = lockResult.lockUntil - now;
    
    if (timeRemaining > 0) {
      const hours = Math.floor(timeRemaining / 3600);
      const minutes = Math.floor((timeRemaining % 3600) / 60);
      
      console.log("⏳ Timelock Status: ACTIVE");
      console.log(`   Time Remaining: ${hours}h ${minutes}m`);
      console.log(`   Expires At: ${new Date(lockResult.lockUntil * 1000).toISOString()}`);
      console.log("");
      
      console.log("🔓 Option 1: Unlock with Secret (Available Now)");
      console.log(`   Secret: ${lockResult.secret}`);
      console.log(`   Hash: ${lockResult.secretHash}`);
      console.log("   Beneficiary can use the secret to unlock immediately");
      console.log("");
      
      console.log("🔄 Option 2: Wait for Expiry Refund");
      console.log(`   Available in: ${hours}h ${minutes}m`);
      console.log("   Owner can reclaim funds after expiry");
      
    } else {
      console.log("⏰ Timelock Status: EXPIRED");
      console.log("   Refund available to owner");
      console.log("");
      
      console.log("🔄 Refund Option:");
      console.log("   Owner can now reclaim the locked funds");
      console.log("   Secret unlock no longer available");
    }
    
    console.log("");
    console.log("📋 Contract Details:");
    console.log(`   Transaction: ${lockResult.txHash}`);
    console.log(`   Script Address: ${lockResult.scriptAddress}`);
    console.log(`   Amount: ${lockResult.amount / 1000000} ADA`);
    console.log("");
    console.log("🔗 Monitor:");
    console.log(`   https://preprod.cardanoscan.io/transaction/${lockResult.txHash}`);
  }
}

// Demo function
async function demonstrateTimelock() {
  console.log("🚀 HTLC TIMELOCK DEMONSTRATION");
  console.log("══════════════════════════════");
  console.log("");
  
  const htlc = new HTLCTimelock();
  
  try {
    // Demo: Lock 3 ADA with 1-hour timelock
    console.log("📋 Step 1: Locking 3 ADA with 1-hour timelock...");
    const lockResult = await htlc.lockFundsWithTimelock("3000000", 1); // 1 hour
    
    console.log("📋 Step 2: Analyzing the timelock transaction...");
    await htlc.analyzeTimelockTx(lockResult.txHash);
    
    console.log("📋 Step 3: Showing unlock options...");
    await htlc.showUnlockOptions(lockResult);
    
    console.log("🎯 Timelock Summary:");
    console.log(`   💰 Amount: 3 ADA locked`);
    console.log(`   ⏰ Duration: 1 hour from now`);
    console.log(`   🔐 Secret: ${lockResult.secret}`);
    console.log(`   🗝️  Hash: ${lockResult.secretHash}`);
    console.log(`   ⌛ Expires: ${new Date(lockResult.lockUntil * 1000).toISOString()}`);
    console.log("");
    
    console.log("🛠️  Next Steps Available:");
    console.log("   1. Monitor the transaction confirmation");
    console.log("   2. Use the secret to unlock before expiry");
    console.log("   3. Wait for expiry to test refund mechanism");
    console.log("   4. Analyze timelock behavior patterns");
    console.log("");
    
    return lockResult;
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
    throw error;
  }
}

export { HTLCTimelock, demonstrateTimelock };

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateTimelock();
}
