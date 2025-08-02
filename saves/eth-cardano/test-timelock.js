import { demonstrateTimelock, HTLCTimelock } from './htlc-timelock.js';
import fs from 'fs';

async function testTimelock() {
  console.log("🧪 TESTING HTLC TIMELOCK FUNCTIONALITY");
  console.log("═════════════════════════════════════");
  console.log("");
  
  const htlc = new HTLCTimelock();
  
  console.log("🎯 Test Scenario: Create a 1-hour timelock");
  console.log("──────────────────────────────────────");
  console.log("");
  
  try {
    // Create a timelock with 1 hour duration
    const result = await demonstrateTimelock();
    
    if (result) {
      console.log("🎉 TIMELOCK CREATED SUCCESSFULLY!");
      console.log("");
      console.log("📊 Summary:");
      console.log(`   💰 Amount Locked: 3 ADA`);
      console.log(`   ⏰ Duration: 1 hour`);
      console.log(`   🔐 Secret Available: Yes`);
      console.log(`   🔗 Transaction: ${result.txHash}`);
      console.log(`   📍 Contract: ${result.contract.scriptAddr}`);
      console.log("");
      
      console.log("🛠️  Next Steps:");
      console.log("   1. Wait a few minutes for transaction confirmation");
      console.log("   2. Use the secret to unlock before expiry, OR");
      console.log("   3. Wait for expiry and test refund functionality");
      console.log("");
      
      console.log("🔍 Monitor on Explorer:");
      console.log(`   https://preprod.cardanoscan.io/transaction/${result.txHash}`);
      console.log("");
      
      // Save contract details for later use
      console.log("💾 Saving contract details to timelock-contract.json...");
      fs.writeFileSync('./timelock-contract.json', JSON.stringify({
        contract: result.contract,
        secret: result.secret,
        lockTxHash: result.txHash,
        lockUntil: result.lockUntil,
        createdAt: new Date().toISOString()
      }, null, 2));
      
      console.log("✅ Contract details saved!");
      
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    console.log("");
    console.log("🔧 Troubleshooting:");
    console.log("   - Check your wallet has sufficient ADA (>3 ADA + fees)");
    console.log("   - Verify Blockfrost API key is working");
    console.log("   - Ensure network connectivity");
  }
}

// Run the test
testTimelock();
