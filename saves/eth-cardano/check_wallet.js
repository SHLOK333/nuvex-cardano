import { beneficiary_wallet } from "./common.js";

async function checkWallet() {
  try {
    console.log("Beneficiary address:", beneficiary_wallet.addresses.baseAddressBech32);
    
    const utxos = await beneficiary_wallet.getUtxos();
    console.log("Available UTXOs:", utxos.length);
    
    utxos.forEach((utxo, i) => {
      console.log(`UTXO ${i}:`, {
        txHash: utxo.input.txHash,
        outputIndex: utxo.input.outputIndex,
        amount: utxo.output.amount
      });
    });
    
    if (utxos.length === 0) {
      console.log("\nThe beneficiary wallet needs ADA for collateral!");
      console.log("Send some test ADA to:", beneficiary_wallet.addresses.baseAddressBech32);
    }
    
  } catch (error) {
    console.error("Error checking wallet:", error);
  }
}

checkWallet();
