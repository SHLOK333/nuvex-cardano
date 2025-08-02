import dotenv from "dotenv";
import fs from "fs";
import { MeshWallet, BlockfrostProvider } from "@meshsdk/core";

// Load environment from parent directory
dotenv.config({ path: "../.env" });

async function testWorking() {
    console.log("🧪 Testing WORKING Configuration Pattern...\n");
    
    const apiKey = process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
    console.log("API Key:", apiKey ? "SET" : "NOT SET");
    
    // Use the exact pattern from test_wallet.js that works
    const provider = new BlockfrostProvider("preprod", apiKey);
    
    console.log("Provider created successfully");
    
    // Load wallet key
    const ownerKey = fs.readFileSync("owner.sk").toString().trim();
    console.log("Owner key loaded, length:", ownerKey.length);
    
    // Create wallet with explicit configuration
    const wallet = new MeshWallet({
        networkId: 0, // explicitly set to testnet
        fetcher: provider,
        submitter: provider,
        key: {
            type: "root",
            bech32: ownerKey,
        },
    });
    
    console.log("Wallet created");
    console.log("Wallet networkId:", wallet.networkId);
    
    // Get address
    const address = await wallet.getChangeAddress();
    console.log("Address:", address);
    console.log("Address type:", address.startsWith("addr_test") ? "TESTNET" : "MAINNET");
    
    // Try to get UTXOs
    console.log("\n🔄 Testing UTXO fetch...");
    try {
        const utxos = await wallet.getUtxos();
        console.log("✅ UTXOs found:", utxos.length);
        
        if (utxos.length > 0) {
            console.log("First UTXO:", JSON.stringify(utxos[0], null, 2));
        } else {
            console.log("❌ No UTXOs found, but no error");
        }
    } catch (error) {
        console.error("❌ UTXO fetch error:", error.message);
    }
    
    // Test getting balance
    console.log("\n💰 Testing balance fetch...");
    try {
        const balance = await wallet.getBalance();
        console.log("✅ Balance:", balance);
    } catch (error) {
        console.error("❌ Balance fetch error:", error.message);
    }
}

testWorking().catch(console.error);
