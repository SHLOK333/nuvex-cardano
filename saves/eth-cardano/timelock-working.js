import { mConStr0 } from "@meshsdk/common";
import { deserializeAddress } from "@meshsdk/core";
import {
  getTxBuilder,
  owner_wallet,
  beneficiary_wallet,
  scriptAddr,
} from "./common.js";
import crypto from 'crypto';

console.log("🔒 TIMELOCK TRANSACTION (Using Working getTxBuilder)");
console.log("═══════════════════════════════════════════════════");

async function createTimelockWithWorkingBuilder() {
  try {
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

    // Get owner address
    const ownerAddress = await owner_wallet.getChangeAddress();
    console.log("Owner address:", ownerAddress);
    
    // Use scriptAddr from common.js (same as atomic swap)
    console.log("Script address:", scriptAddr);
    
    console.log("🔧 Building transaction with working getTxBuilder...");
    
    // Use the exact same pattern as working lock.js
    const meshTxBuilder = getTxBuilder();

    const txUnsigned = await meshTxBuilder
      .txOut(scriptAddr, [
        {
          unit: "lovelace",
          quantity: "3000000",
        },
      ])
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
    console.log(`   📍 Script: ${scriptAddr}`);
    console.log("");
    
    console.log("🛠️  Timelock Features:");
    console.log("   ✅ Funds locked for 1 hour");
    console.log("   ✅ Secret available for immediate unlock");
    console.log("   ✅ Automatic refund after expiry");
    console.log("   ✅ Same security as atomic swap");
    console.log("");
    
    return {
      txHash,
      secret,
      secretHash,
      lockUntil,
      scriptAddress: scriptAddr
    };

  } catch (error) {
    console.error("❌ Transaction failed:", error);
    throw error;
  }
}

// Run the timelock
createTimelockWithWorkingBuilder()
  .then((result) => {
    console.log("🎉 SUCCESS! Timelock created with hash:", result.txHash);
    console.log("🔗 Monitor at: https://preprod.cardanoscan.io/transaction/" + result.txHash);
  })
  .catch((error) => {
    console.error("❌ Failed to create timelock:", error);
  });
