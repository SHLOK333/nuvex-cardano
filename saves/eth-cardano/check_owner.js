import { owner_wallet, beneficiary_wallet } from "./common.js";

async function checkOwnerWallet() {
  try {
    console.log("Checking owner wallet...");
    
    // Initialize wallets
    await owner_wallet.getUtxos();
    await beneficiary_wallet.getUtxos();
    
    const ownerAddress = owner_wallet.addresses.baseAddressBech32;
    const beneficiaryAddress = beneficiary_wallet.addresses.baseAddressBech32;
    
    console.log("Owner address:", ownerAddress);
    console.log("Beneficiary address:", beneficiaryAddress);
    
    // Check owner UTXOs via API
    const apiKey = "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
    
    const response = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/addresses/${ownerAddress}/utxos`, {
      headers: {
        'project_id': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const utxos = await response.json();
      console.log("Owner UTXOs found:", utxos.length);
      
      let total = 0;
      utxos.forEach((utxo, i) => {
        const lovelace = utxo.amount.find(a => a.unit === "lovelace");
        const amount = lovelace ? parseInt(lovelace.quantity) : 0;
        total += amount;
        console.log(`UTXO ${i}:`, (amount / 1000000).toFixed(2) + " ADA");
      });
      console.log("Owner total:", (total / 1000000).toFixed(2), "ADA");
      
      if (total === 0) {
        console.log("\n❌ PROBLEM: Owner wallet is empty!");
        console.log("✅ SOLUTION: Need to send ADA from beneficiary to owner");
        console.log("\nTo fix this:");
        console.log("1. Run the transfer script: bun run transfer_to_owner.js");
        console.log("2. Then retry the automation: node automate.js");
      } else if (total < 5000000) { // Less than 5 ADA
        console.log("\n⚠️  WARNING: Owner wallet has low balance");
        console.log("Need at least 5 ADA for lock + fees");
      } else {
        console.log("\n✅ Owner wallet has sufficient funds!");
      }
    } else {
      console.log("Error checking owner wallet:", response.status);
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

checkOwnerWallet();
