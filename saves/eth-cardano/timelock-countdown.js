console.log("⏰ CARDANO TIMELOCK AUTO-REFUND COUNTDOWN");
console.log("═══════════════════════════════════════");
console.log("");

const TIMELOCK_TX = "82c7169fd4d336ea6108d40d96f5ec92d94c7b8240c3c7da84951ea376234f93";
const EXPIRY_TIME = new Date("2025-08-02T10:07:39.000Z");

function showCountdown() {
    const now = new Date();
    const timeUntilExpiry = EXPIRY_TIME.getTime() - now.getTime();
    
    console.clear();
    console.log("⏰ CARDANO TIMELOCK AUTO-REFUND COUNTDOWN");
    console.log("═══════════════════════════════════════");
    console.log("");
    
    console.log("📋 TIMELOCK DETAILS:");
    console.log("   TX Hash:", TIMELOCK_TX);
    console.log("   Amount: 3 ADA");
    console.log("   Expiry:", EXPIRY_TIME.toISOString());
    console.log("   Current:", now.toISOString());
    console.log("");
    
    if (timeUntilExpiry > 0) {
        const hours = Math.floor(timeUntilExpiry / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeUntilExpiry % (1000 * 60)) / 1000);
        
        console.log("🔒 STATUS: TIMELOCK ACTIVE");
        console.log(`⏳ TIME REMAINING: ${hours}h ${minutes}m ${seconds}s`);
        console.log("");
        console.log("💡 OPTIONS:");
        console.log("   1️⃣ Wait for auto-refund (no fees needed)");
        console.log("   2️⃣ Add ADA to wallet and unlock with secret");
        console.log("");
        console.log("🔗 MONITOR:");
        console.log("   https://preprod.cardanoscan.io/transaction/" + TIMELOCK_TX);
        
    } else {
        const timeExpired = Math.abs(timeUntilExpiry);
        const hours = Math.floor(timeExpired / (1000 * 60 * 60));
        const minutes = Math.floor((timeExpired % (1000 * 60 * 60)) / (1000 * 60));
        
        console.log("✅ STATUS: TIMELOCK EXPIRED!");
        console.log(`🎉 EXPIRED: ${hours}h ${minutes}m ago`);
        console.log("");
        console.log("💰 YOUR 3 ADA IS NOW AVAILABLE FOR REFUND!");
        console.log("🔄 Action: Claim refund (no secret needed)");
        console.log("💸 Fees: Minimal (just network fees)");
        console.log("");
        console.log("🚀 NEXT STEP:");
        console.log("   Run refund claim script to get your 3 ADA back!");
        console.log("");
        console.log("🔗 VERIFY EXPIRY:");
        console.log("   https://preprod.cardanoscan.io/transaction/" + TIMELOCK_TX);
        
        return; // Stop countdown
    }
}

// Show initial countdown
showCountdown();

// Update every 10 seconds until expiry
const interval = setInterval(() => {
    const now = new Date();
    const timeUntilExpiry = EXPIRY_TIME.getTime() - now.getTime();
    
    if (timeUntilExpiry <= 0) {
        showCountdown();
        clearInterval(interval);
        console.log("");
        console.log("🎉 TIMELOCK EXPIRED! Your 3 ADA is ready for refund!");
    } else {
        showCountdown();
    }
}, 10000);

console.log("");
