import { owner_wallet, beneficiary_wallet } from "./common.js";

async function checkWallets() {
  try {
    console.log("=== Owner Wallet ===");
    console.log("Owner address:", owner_wallet.addresses.baseAddressBech32);
    
    const ownerUtxos = await owner_wallet.getUtxos();
    console.log("Owner UTXOs:", ownerUtxos.length);
    
    let ownerTotal = 0;
    ownerUtxos.forEach((utxo, i) => {
      const lovelace = utxo.output.amount.find(a => a.unit === "lovelace");
      const amount = lovelace ? parseInt(lovelace.quantity) : 0;
      ownerTotal += amount;
      console.log(`UTXO ${i}:`, {
        txHash: utxo.input.txHash.substring(0, 16) + "...",
        amount: (amount / 1000000).toFixed(2) + " ADA"
      });
    });
    console.log("Owner total:", (ownerTotal / 1000000).toFixed(2), "ADA");
    
    console.log("\n=== Beneficiary Wallet ===");
    console.log("Beneficiary address:", beneficiary_wallet.addresses.baseAddressBech32);
    
    const beneficiaryUtxos = await beneficiary_wallet.getUtxos();
    console.log("Beneficiary UTXOs:", beneficiaryUtxos.length);
    
    let beneficiaryTotal = 0;
    beneficiaryUtxos.forEach((utxo, i) => {
      const lovelace = utxo.output.amount.find(a => a.unit === "lovelace");
      const amount = lovelace ? parseInt(lovelace.quantity) : 0;
      beneficiaryTotal += amount;
      console.log(`UTXO ${i}:`, {
        txHash: utxo.input.txHash.substring(0, 16) + "...",
        amount: (amount / 1000000).toFixed(2) + " ADA"
      });
    });
    console.log("Beneficiary total:", (beneficiaryTotal / 1000000).toFixed(2), "ADA");
    
    if (beneficiaryUtxos.length === 0) {
      console.log("\n🚨 SOLUTION: Send some ADA from owner to beneficiary for collateral");
      console.log("From:", owner_wallet.addresses.baseAddressBech32);
      console.log("To:  ", beneficiary_wallet.addresses.baseAddressBech32);
      console.log("Amount: ~5 ADA should be enough");
    }
    
  } catch (error) {
    console.error("Error checking wallets:", error);
  }
}

checkWallets();
