import { BlockfrostProvider, MeshWallet } from "@meshsdk/core";
import fs from "fs";
import dotenv from "dotenv";

// Load environment from parent directory
dotenv.config({ path: "../.env" });

console.log("🧪 Testing MeshSDK Network Configuration...\n");

// Check if API key is loaded
const apiKey = process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
console.log("API Key:", apiKey ? "SET" : "NOT SET");
console.log("API Key type:", typeof apiKey);

// Create provider explicitly using the working pattern
const provider = new BlockfrostProvider(
  "preprod",
  apiKey
);

console.log("Provider created:", provider.constructor.name);
console.log("Provider network:", provider.network);

// Create wallet with explicit networkId
const wallet = new MeshWallet({
  networkId: 0, // Explicitly set to testnet
  fetcher: provider,
  submitter: provider,
  key: {
    type: "root",
    bech32: fs.readFileSync("owner.sk").toString().trim(),
  },
});

console.log("Wallet networkId:", wallet.networkId);

async function testConfiguration() {
    const address = await wallet.getChangeAddress();
    console.log("Wallet address:", address);
    console.log("Address type:", address.startsWith("addr_test") ? "TESTNET" : "MAINNET");
    
    // Check if the wallet can detect UTXOs
    console.log("\nTesting UTXO fetch...");
    const utxos = await wallet.getUtxos();
    console.log("UTXOs found:", utxos.length);
    
    if (utxos.length === 0) {
        console.log("❌ No UTXOs found - this is the problem!");
        
        // Try to manually fetch from provider
        console.log("\nTrying direct provider fetch...");
        try {
            const directUtxos = await provider.fetchUTxOs(address);
            console.log("Direct UTXOs found:", directUtxos.length);
        } catch (error) {
            console.error("Direct fetch error:", error.message);
        }
    }
}

testConfiguration().catch(console.error);
