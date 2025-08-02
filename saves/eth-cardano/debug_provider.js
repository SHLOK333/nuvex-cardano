import dotenv from "dotenv";
import { BlockfrostProvider } from "@meshsdk/core";

// Load environment from parent directory
dotenv.config({ path: "../.env" });

async function debugProvider() {
    console.log("🔍 Debugging Provider Direct Call...\n");
    
    const apiKey = process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
    console.log("API Key:", apiKey);
    
    const provider = new BlockfrostProvider("preprod", apiKey);
    console.log("Provider created");
    
    // Test with owner address
    const ownerAddress = "addr_test1qqhlxua3c9rrqyvce7l744wajtguwdcmn6kzf37gm0p4cahxf4mug86n3whyyanpqtj4s57ta4ttkqpn9mzquqcq6pls0tdvj6";
    
    console.log("Testing provider.fetchUTxOs()...");
    try {
        const utxos = await provider.fetchUTxOs(ownerAddress);
        console.log("✅ UTXOs found:", utxos.length);
        if (utxos.length > 0) {
            console.log("First UTXO:", JSON.stringify(utxos[0], null, 2));
        }
    } catch (error) {
        console.error("❌ Provider fetchUTxOs error:", error);
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
    }
    
    // Test with direct fetch method if available
    console.log("\nTesting provider methods...");
    console.log("Available methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(provider)));
}

debugProvider().catch(console.error);
