import fs from "fs";
import { MeshWallet } from "@meshsdk/core";

async function debugWallet() {
  try {
    console.log("=== Debugging Wallet Issue ===");
    
    // Load the key file
    const beneficiaryKey = fs.readFileSync("beneficiary.sk").toString().trim();
    console.log("Key length:", beneficiaryKey.length);
    console.log("Key starts with:", beneficiaryKey.substring(0, 10));
    
    // Try creating wallet without provider first
    console.log("\nTrying to create wallet without provider...");
    const wallet = new MeshWallet({
      networkId: 0, // 0 = testnet, 1 = mainnet
      key: {
        type: "root",
        bech32: beneficiaryKey,
      },
    });
    
    console.log("Wallet created");
    
    // Try to get addresses
    try {
      const addresses = wallet.addresses;
      console.log("Addresses object:", addresses);
      
      if (addresses) {
        console.log("Base address:", addresses.baseAddressBech32);
        console.log("Enterprise address:", addresses.enterpriseAddressBech32);
        console.log("Reward address:", addresses.rewardAddressBech32);
      }
    } catch (addrError) {
      console.log("Address generation error:", addrError);
    }
    
    // Alternative: try to manually generate address
    console.log("\n=== Alternative Address Generation ===");
    try {
      // Use a different approach
      const wallet2 = new MeshWallet({
        networkId: 0,
        key: {
          type: "root", 
          bech32: beneficiaryKey
        }
      });
      
      // Try accessing addresses differently
      const addr = wallet2.getPaymentAddress();
      console.log("Payment address:", addr);
      
    } catch (e) {
      console.log("Alternative failed:", e.message);
    }
    
  } catch (error) {
    console.error("Debug error:", error);
    console.error("Error message:", error.message);
  }
}

debugWallet();
