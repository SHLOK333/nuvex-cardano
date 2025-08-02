import { owner_wallet, blockchainProvider } from "./common.js";

async function debugMeshSDK() {
    console.log("🔍 Debugging MeshSDK Configuration...\n");
    
    // Check provider network
    console.log("📡 Provider Network Info:");
    console.log("Provider type:", blockchainProvider.constructor.name);
    console.log("Provider network:", blockchainProvider.network || "Not specified");
    
    // Check wallet configuration
    console.log("\n💼 Wallet Configuration:");
    console.log("Owner wallet networkId:", owner_wallet.networkId);
    console.log("Owner wallet network:", owner_wallet.network || "Not specified");
    
    // Get wallet address
    console.log("\n📍 Wallet Address:");
    const address = await owner_wallet.getChangeAddress();
    console.log("Address:", address);
    
    // Check if address is testnet or mainnet
    const isTestnet = address.startsWith("addr_test");
    const isMainnet = address.startsWith("addr");
    console.log("Address type:", isTestnet ? "TESTNET" : isMainnet ? "MAINNET" : "UNKNOWN");
    
    // Try to get UTXOs with detailed logging
    console.log("\n🔄 Fetching UTXOs...");
    try {
        const utxos = await owner_wallet.getUtxos();
        console.log("UTXOs count:", utxos.length);
        if (utxos.length > 0) {
            console.log("First UTXO:", JSON.stringify(utxos[0], null, 2));
        }
    } catch (error) {
        console.error("UTXO fetch error:", error.message);
    }
    
    // Try direct provider call
    console.log("\n🔗 Direct Provider Call:");
    try {
        const utxos = await blockchainProvider.fetchUTxOs(address);
        console.log("Direct provider UTXOs count:", utxos.length);
        if (utxos.length > 0) {
            console.log("First direct UTXO:", JSON.stringify(utxos[0], null, 2));
        }
    } catch (error) {
        console.error("Direct provider error:", error.message);
    }
    
    // Test transaction builder
    console.log("\n⚙️ Transaction Builder Test:");
    try {
        const { getTxBuilder } = await import("./common.js");
        const txBuilder = getTxBuilder();
        console.log("TxBuilder created successfully");
        console.log("TxBuilder networkId:", txBuilder.networkId);
    } catch (error) {
        console.error("TxBuilder error:", error.message);
    }
}

debugMeshSDK().catch(console.error);
