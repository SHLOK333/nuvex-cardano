import { beneficiary_wallet, blockchainProvider } from "./common.js";

async function setupCollateral() {
  try {
    console.log("Setting up collateral for beneficiary wallet...");
    
    // Initialize wallet address
    await beneficiary_wallet.getUtxos();
    const address = beneficiary_wallet.addresses.baseAddressBech32;
    console.log("Beneficiary address:", address);
    
    // Check current UTXOs
    const utxos = await beneficiary_wallet.getUtxos();
    console.log("Current UTXOs:", utxos.length);
    
    if (utxos.length === 0) {
      console.log("❌ No UTXOs found. Wallet needs funding.");
      return;
    }
    
    // Try to create collateral
    try {
      console.log("Attempting to create collateral...");
      const result = await beneficiary_wallet.createCollateral();
      console.log("✅ Collateral creation result:", result);
    } catch (collateralError) {
      console.log("Collateral creation failed:", collateralError.message);
      
      // Check if we already have collateral
      try {
        const existing = await beneficiary_wallet.getCollateral();
        console.log("Existing collateral found:", existing.length);
        existing.forEach((col, i) => {
          console.log(`Collateral ${i}:`, {
            txHash: col.input.txHash.substring(0, 16) + "...",
            amount: col.output.amount
          });
        });
      } catch (getError) {
        console.log("No existing collateral available");
      }
    }
    
  } catch (error) {
    console.error("Setup error:", error);
  }
}

setupCollateral();
