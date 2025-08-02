import { owner_wallet } from './common.js';

console.log("🔍 WALLET ANALYSIS");
console.log("═════════════════");

async function analyzeWallet() {
  try {
    const ownerAddr = await owner_wallet.getChangeAddress();
    console.log("📍 Owner Address:", ownerAddr);
    
    // Try to get UTXOs using MeshSDK
    console.log("🔍 Checking UTXOs via MeshSDK...");
    try {
      const utxos = await owner_wallet.getUtxos();
      console.log(`   UTXOs found: ${utxos.length}`);
      if (utxos.length > 0) {
        console.log("   First UTXO:", utxos[0]);
      }
    } catch (error) {
      console.log("   ❌ MeshSDK UTXOs failed:", error.message);
    }
    
    // Try direct API call
    console.log("🔍 Checking via Blockfrost API...");
    try {
      const response = await fetch(
        `https://cardano-preprod.blockfrost.io/api/v0/addresses/${ownerAddr}/utxos`,
        { headers: { project_id: 'preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5' } }
      );
      
      if (response.ok) {
        const utxos = await response.json();
        console.log(`   API UTXOs found: ${utxos.length}`);
        if (utxos.length > 0) {
          console.log("   First API UTXO:", utxos[0]);
          const totalAda = utxos.reduce((sum, utxo) => {
            const lovelace = utxo.amount.find(a => a.unit === 'lovelace')?.quantity || '0';
            return sum + parseInt(lovelace);
          }, 0);
          console.log(`   Total ADA: ${totalAda / 1000000} ADA`);
        }
      } else {
        console.log("   ❌ API response error:", response.status, response.statusText);
      }
    } catch (error) {
      console.log("   ❌ API call failed:", error.message);
    }
    
    // Check previous transactions
    console.log("🔍 Checking recent transactions...");
    try {
      const response = await fetch(
        `https://cardano-preprod.blockfrost.io/api/v0/addresses/${ownerAddr}/transactions?count=5`,
        { headers: { project_id: 'preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5' } }
      );
      
      if (response.ok) {
        const txs = await response.json();
        console.log(`   Recent transactions: ${txs.length}`);
        if (txs.length > 0) {
          console.log("   Latest tx:", txs[0]);
        }
      }
    } catch (error) {
      console.log("   ❌ Transaction check failed:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Analysis failed:", error);
  }
}

analyzeWallet();
