const expiry = new Date('2025-08-02T10:07:39.000Z');
const now = new Date();
const diff = expiry.getTime() - now.getTime();
const minutes = Math.floor(diff / (1000 * 60));
const seconds = Math.floor((diff % (1000 * 60)) / 1000);

console.log("⏰ TIMELOCK EXPIRY STATUS");
console.log("========================");
console.log("");
console.log("🕐 Current Time:", now.toISOString());
console.log("⏰ Expiry Time:", expiry.toISOString());

if (diff > 0) {
    console.log(`⏳ Time Remaining: ${minutes} minutes ${seconds} seconds`);
    console.log("");
    console.log("💡 WHAT HAPPENS NEXT:");
    console.log("   1. ⏰ Wait", minutes, "minutes for expiry");
    console.log("   2. 🔄 Auto-refund becomes available");
    console.log("   3. 💰 Claim your 3 ADA back (minimal fees)");
    console.log("   4. ✅ Cross-chain timelock cycle complete!");
} else {
    console.log("🎉 TIMELOCK EXPIRED! Auto-refund available now!");
    console.log("");
    console.log("💰 YOUR 3 ADA IS READY FOR REFUND!");
    console.log("🔄 No secret needed - just claim refund");
}

console.log("");
console.log("🔗 MONITOR PROGRESS:");
console.log("   https://preprod.cardanoscan.io/transaction/82c7169fd4d336ea6108d40d96f5ec92d94c7b8240c3c7da84951ea376234f93");
console.log("");
console.log("💳 YOUR WALLET:");
console.log("   addr_test1qqhlxua3c9rrqyvce7l744wajtguwdcmn6kzf37gm0p4cahxf4mug86n3whyyanpqtj4s57ta4ttkqpn9mzquqcq6pls0tdvj6");
