import { demonstrateTimelock } from './htlc-timelock-simple.js';

console.log("🚀 Starting HTLC Timelock Test...");
console.log("");

demonstrateTimelock()
  .then(() => {
    console.log("✅ Test completed successfully!");
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
  });
