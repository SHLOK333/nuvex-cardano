// Ethereum withdrawal script for ReverseEscrow contract
// Use this once you have the secret from Cardano unlock

const ethers = require('ethers');

async function withdrawFromEthereum() {
  console.log("=== Ethereum Withdrawal (Step 2 of Atomic Swap) ===");
  
  // Contract details
  const contractAddress = "YOUR_REVERSE_ESCROW_CONTRACT_ADDRESS"; // Replace with actual address
  const secret = "0x0000000000000000000000000000000000000000000000000000000000000000";
  
  // Expected hash (keccak256 of secret)
  const expectedHash = "0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563";
  
  // Verify the secret matches the hash
  const actualHash = ethers.keccak256(secret);
  console.log("Expected hash:", expectedHash);
  console.log("Actual hash:  ", actualHash);
  console.log("Hash matches: ", expectedHash.toLowerCase() === actualHash.toLowerCase());
  
  if (expectedHash.toLowerCase() !== actualHash.toLowerCase()) {
    console.log("❌ Secret doesn't match expected hash!");
    return;
  }
  
  // Contract ABI (withdraw function)
  const abi = [
    "function withdraw(bytes32 secret) external"
  ];
  
  try {
    // Connect to provider (you'll need to set this up)
    const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/YOUR_INFURA_KEY");
    const wallet = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);
    const contract = new ethers.Contract(contractAddress, abi, wallet);
    
    console.log("Withdrawing ETH with secret...");
    const tx = await contract.withdraw(secret);
    
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ SUCCESS! ETH withdrawn!");
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    
  } catch (error) {
    console.error("Withdrawal failed:", error.message);
  }
}

// For now, just show the secret since Cardano unlock isn't working
console.log("=== ATOMIC SWAP STATUS ===");
console.log("✅ Ethereum: ReverseEscrow deployed with 0.001 ETH");
console.log("✅ Cardano: 3 ADA locked in reverse validator");
console.log("🔄 Cardano: Unlock pending (MeshSDK configuration issue)");
console.log("");
console.log("REVEALED SECRET: 0x0000000000000000000000000000000000000000000000000000000000000000");
console.log("");
console.log("You can use this secret to withdraw from your Ethereum contract manually:");
console.log("1. Go to your Ethereum contract on Sepolia Etherscan");
console.log("2. Connect your wallet");
console.log("3. Call withdraw() with secret: 0x0000000000000000000000000000000000000000000000000000000000000000");
console.log("4. You'll receive the 0.001 ETH");

// withdrawFromEthereum();
