async function checkBeneficiaryFunding() {
  const address = "addr_test1qrsctgjfuc3zwne669fcy2dfc4u6n68ugf7e8f7k968r4d0st5f8vs62unr63480wfswhhpvnplgdx3tjecvpt7sekc3sfyj3um";
  const apiKey = "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
  
  console.log("Checking beneficiary funding...");
  console.log("Address:", address);
  
  try {
    const response = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/addresses/${address}/utxos`, {
      headers: {
        'project_id': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log("API Response:", response.status, response.statusText);
    
    if (response.ok) {
      const utxos = await response.json();
      console.log("UTXOs found:", utxos.length);
      
      if (utxos.length > 0) {
        let total = 0;
        utxos.forEach((utxo, i) => {
          const lovelace = utxo.amount.find(a => a.unit === "lovelace");
          const amount = lovelace ? parseInt(lovelace.quantity) : 0;
          total += amount;
          console.log(`UTXO ${i}:`, {
            txHash: utxo.tx_hash.substring(0, 16) + "...",
            amount: (amount / 1000000).toFixed(2) + " ADA"
          });
        });
        console.log("Total ADA:", (total / 1000000).toFixed(2));
        console.log("✅ Wallet is funded! Ready to unlock.");
      } else {
        console.log("❌ No UTXOs found. The funding transaction may not have confirmed yet.");
        console.log("Please wait a few minutes and try again, or check the faucet transaction.");
      }
    } else {
      const errorText = await response.text();
      console.log("API Error:", errorText);
    }
    
  } catch (error) {
    console.error("Error checking funding:", error);
  }
}

checkBeneficiaryFunding();
