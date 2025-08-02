// Direct Blockfrost API test
async function testDirectBlockfrost() {
  const apiKey = process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
  const baseUrl = "https://cardano-preprod.blockfrost.io/api/v0";
  const scriptAddr = "addr_test1wz9vanf0yq47gckhyp6kj6f74pd73je0uwsn0sa6u5pcpfcn52cn7";
  
  console.log("Testing direct Blockfrost API call...");
  console.log("API Key:", apiKey.substring(0, 10) + "...");
  console.log("Base URL:", baseUrl);
  console.log("Script Address:", scriptAddr);
  
  try {
    const response = await fetch(`${baseUrl}/addresses/${scriptAddr}/utxos`, {
      headers: {
        'project_id': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log("Response status:", response.status);
    console.log("Response statusText:", response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log("Error response:", errorText);
      return;
    }
    
    const data = await response.json();
    console.log("Success! Found", data.length, "UTXOs");
    
    data.forEach((utxo, i) => {
      console.log(`UTXO ${i}:`, {
        txHash: utxo.tx_hash,
        outputIndex: utxo.output_index,
        amount: utxo.amount
      });
    });
    
  } catch (error) {
    console.error("Fetch error:", error.message);
    console.error("Full error:", error);
  }
}

testDirectBlockfrost();
