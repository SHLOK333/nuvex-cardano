import fs from "fs";
import { MeshWallet, BlockfrostProvider } from "@meshsdk/core";

async function testWalletLoading() {
  try {
    console.log("Testing wallet loading...");
    
    // Create provider
    const provider = new BlockfrostProvider(
      "preprod",
      process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5"
    );
    
    // Load beneficiary wallet
    const beneficiaryKey = fs.readFileSync("beneficiary.sk").toString().trim();
    console.log("Beneficiary key loaded, length:", beneficiaryKey.length);
    
    const beneficiary = new MeshWallet({
      networkId: 0,
      fetcher: provider,
      submitter: provider,
      key: {
        type: "root",
        bech32: beneficiaryKey,
      },
    });
    
    console.log("Wallet created successfully");
    
    // Get address
    const address = beneficiary.addresses.baseAddressBech32;
    console.log("Beneficiary address:", address);
    
    // Test with direct API call to check UTXOs
    const apiKey = process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
    const response = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/addresses/${address}/utxos`, {
      headers: {
        'project_id': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const utxos = await response.json();
      console.log("UTXOs found:", utxos.length);
      
      let total = 0;
      utxos.forEach((utxo, i) => {
        const lovelace = utxo.amount.find(a => a.unit === "lovelace");
        const amount = lovelace ? parseInt(lovelace.quantity) : 0;
        total += amount;
        console.log(`UTXO ${i}:`, {
          txHash: utxo.tx_hash.substring(0, 16) + "...",
          amount: (amount / 1000000).toFixed(2) + " ADA"
        });
      });
      console.log("Total:", (total / 1000000).toFixed(2), "ADA");
    } else {
      console.log("API response error:", response.status, response.statusText);
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

testWalletLoading();
