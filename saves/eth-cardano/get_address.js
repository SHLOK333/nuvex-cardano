import { beneficiary_wallet } from "./common.js";

async function getCorrectAddress() {
  try {
    console.log("Getting beneficiary address...");
    
    // Force address generation by calling getUtxos
    await beneficiary_wallet.getUtxos();
    
    const address = beneficiary_wallet.addresses.baseAddressBech32;
    console.log("Beneficiary address:", address);
    console.log("Address length:", address.length);
    
    // Test the address with Blockfrost
    const apiKey = "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
    
    try {
      const response = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/addresses/${address}/utxos`, {
        headers: {
          'project_id': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      console.log("API test:", response.status, response.statusText);
      
      if (response.ok) {
        const utxos = await response.json();
        console.log("✅ Address is valid! UTXOs found:", utxos.length);
        
        if (utxos.length > 0) {
          let total = 0;
          utxos.forEach((utxo, i) => {
            const lovelace = utxo.amount.find(a => a.unit === "lovelace");
            const amount = lovelace ? parseInt(lovelace.quantity) : 0;
            total += amount;
            console.log(`UTXO ${i}:`, (amount / 1000000).toFixed(2) + " ADA");
          });
          console.log("Total:", (total / 1000000).toFixed(2), "ADA");
        } else {
          console.log("No UTXOs yet. Fund this address:", address);
        }
      } else {
        const error = await response.text();
        console.log("❌ Address validation failed:", error);
      }
    } catch (apiError) {
      console.log("API error:", apiError.message);
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

getCorrectAddress();
