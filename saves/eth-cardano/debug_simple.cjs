const { createRequire } = require('module');
const require = createRequire(import.meta.url);

// This won't work with ES modules, so let's create a simple test instead
console.log("🔍 Simple WSL + Node.js Test...\n");

// Test environment loading
require('dotenv').config({ path: "../.env" });

console.log("📡 Environment Test:");
console.log("BLOCKFROST_API_KEY:", process.env.BLOCKFROST_API_KEY ? "SET" : "NOT SET");

// Test HTTP fetch
async function testBlockfrost() {
    const apiKey = process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
    const address = "addr_test1qqhlxua3c9rrqyvce7l744wajtguwdcmn6kzf37gm0p4cahxf4mug86n3whyyanpqtj4s57ta4ttkqpn9mzquqcq6pls0tdvj6";
    const url = `https://cardano-preprod.blockfrost.io/api/v0/addresses/${address}/utxos`;
    
    console.log("\n🌐 Testing direct HTTP to Blockfrost...");
    
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(url, {
            headers: { 'project_id': apiKey }
        });
        
        console.log("Response status:", response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ UTXOs found:", data.length);
            if (data.length > 0) {
                const firstUtxo = data[0];
                const lovelace = firstUtxo.amount.find(a => a.unit === "lovelace");
                console.log("First UTXO amount:", parseInt(lovelace.quantity) / 1000000, "ADA");
            }
        } else {
            console.log("❌ HTTP Error:", response.statusText);
        }
    } catch (error) {
        console.error("❌ Test failed:", error.message);
    }
}

testBlockfrost();
