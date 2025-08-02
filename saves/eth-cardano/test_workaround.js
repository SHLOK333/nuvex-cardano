import { owner_wallet, getWalletUtxos, getWalletBalance } from "./common_fixed.js";

async function testWorkaround() {
    console.log("🔧 Testing MeshSDK Workaround...\n");
    
    const address = await owner_wallet.getChangeAddress();
    console.log("Owner address:", address);
    
    // Test normal MeshSDK method
    console.log("\n📡 Testing normal MeshSDK getUtxos():");
    const normalUtxos = await owner_wallet.getUtxos();
    console.log("Normal UTXOs found:", normalUtxos.length);
    
    // Test workaround method
    console.log("\n🔧 Testing workaround getWalletUtxos():");
    const workaroundUtxos = await getWalletUtxos(owner_wallet);
    console.log("Workaround UTXOs found:", workaroundUtxos.length);
    
    if (workaroundUtxos.length > 0) {
        console.log("First UTXO:", JSON.stringify(workaroundUtxos[0], null, 2));
    }
    
    // Test balance
    console.log("\n💰 Testing workaround balance:");
    const balance = await getWalletBalance(owner_wallet);
    console.log("Balance:", balance / 1000000, "ADA");
}

testWorkaround().catch(console.error);
