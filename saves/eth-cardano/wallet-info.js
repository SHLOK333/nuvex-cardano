import {
  getTxBuilder,
  owner_wallet,
  beneficiary_wallet,
} from "./common.js";

async function showWalletInfo() {
    console.log("💳 WALLET INFORMATION");
    console.log("====================");
    console.log("");
    
    try {
        // Get wallet addresses
        const ownerAddresses = await owner_wallet.getUnusedAddresses();
        const usedAddresses = await owner_wallet.getUsedAddresses();
        const allAddresses = [...ownerAddresses, ...usedAddresses];
        
        console.log("📍 WALLET ADDRESSES:");
        if (ownerAddresses.length > 0) {
            console.log("   Primary Address:", ownerAddresses[0]);
        }
        
        if (allAddresses.length > 1) {
            console.log("   Total Addresses:", allAddresses.length);
            allAddresses.forEach((addr, i) => {
                console.log(`   Address ${i + 1}:`, addr);
            });
        }
        
        console.log("");
        
        // Get UTXOs
        console.log("💰 WALLET UTXOs:");
        const utxos = await owner_wallet.getUtxos();
        console.log("   Total UTXOs:", utxos.length);
        
        if (utxos.length === 0) {
            console.log("   ❌ No UTXOs available");
            console.log("   💡 This means no ADA available for transaction fees");
        } else {
            let totalAda = 0;
            utxos.forEach((utxo, i) => {
                const lovelaceAmount = utxo.output.amount.find(a => a.unit === "lovelace");
                if (lovelaceAmount) {
                    const ada = parseInt(lovelaceAmount.quantity) / 1000000;
                    totalAda += ada;
                    console.log(`   UTXO ${i + 1}: ${ada} ADA (${utxo.input.txHash.substring(0, 16)}...)`);
                }
            });
            console.log(`   💰 Total Available: ${totalAda} ADA`);
        }
        
        console.log("");
        console.log("🔍 BALANCE CHECK:");
        
        // Check balance via HTTP for comparison
        const primaryAddress = ownerAddresses[0] || "addr_test1qqhlxua3c9rrqyvce7l744wajtguwdcmn6kzf37gm0p4cahxf4mug86n3whyyanpqtj4s57ta4ttkqpn9mzquqcq6pls0tdvj6";
        
        try {
            console.log("📡 Fetching balance via HTTP...");
            const response = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/addresses/${primaryAddress}`, {
                headers: { 'project_id': 'preprodtpF5oF5BSFh99aeSgUJcswWV1OlOlxmn' }
            });
            
            if (response.ok) {
                const addressInfo = await response.json();
                const totalBalance = parseInt(addressInfo.amount[0].quantity) / 1000000;
                console.log("   💳 Total Balance:", totalBalance, "ADA");
                console.log("   📊 TX Count:", addressInfo.tx_count);
            } else {
                console.log("   ⚠️ HTTP balance check failed");
            }
        } catch (error) {
            console.log("   ⚠️ Balance check error:", error.message);
        }
        
        console.log("");
        console.log("🔗 LINKS:");
        console.log("   CardanoScan:", `https://preprod.cardanoscan.io/address/${primaryAddress}`);
        
        console.log("");
        console.log("💡 FOR TIMELOCK UNLOCK:");
        if (utxos.length === 0) {
            console.log("   ❌ No UTXOs = Cannot unlock timelock now");
            console.log("   ⏰ Wait for timelock expiry (~20 minutes)");
            console.log("   🔄 After expiry: Refund available without fees");
        } else {
            console.log("   ✅ UTXOs available = Can unlock timelock!");
            console.log("   🔓 Use unlock-http.js to claim your 3 ADA");
        }
        
    } catch (error) {
        console.error("❌ Wallet info error:", error.message);
        console.log("");
        console.log("💡 Fallback address:");
        console.log("   addr_test1qqhlxua3c9rrqyvce7l744wajtguwdcmn6kzf37gm0p4cahxf4mug86n3whyyanpqtj4s57ta4ttkqpn9mzquqcq6pls0tdvj6");
    }
}

showWalletInfo().catch(console.error);
