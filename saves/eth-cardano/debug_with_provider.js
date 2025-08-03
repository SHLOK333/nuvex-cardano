import fs from "fs";
import { 
  MeshWallet, 
  BlockfrostProvider,
  resolvePaymentKeyHash,
  deserializeAddress 
} from "@meshsdk/core";

async function debugWithProvider() {
  try {
    console.log("=== Testing with Provider ===");
    
    const provider = new BlockfrostProvider(
      "preprod",
      "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5"
    );
    
    const beneficiaryKey = fs.readFileSync("beneficiary.sk").toString().trim();
    
    const wallet = new MeshWallet({
      networkId: 0,
      fetcher: provider,
      submitter: provider,
      key: {
        type: "root",
        bech32: beneficiaryKey,
      },
    });
    
    console.log("Wallet with provider created");
    
    // Try different ways to get address
    console.log("Addresses:", wallet.addresses);
    
    // Try to use the wallet to get UTXOs (this might force address generation)
    try {
      console.log("Attempting getUtxos...");
      const utxos = await wallet.getUtxos();
      console.log("UTXOs retrieved:", utxos.length);
      console.log("Addresses after getUtxos:", wallet.addresses);
    } catch (utxoError) {
      console.log("getUtxos error:", utxoError.message);
    }
    
    // Let's also check what methods are available
    console.log("\nAvailable wallet methods:");
    console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(wallet)));
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

debugWithProvider();
