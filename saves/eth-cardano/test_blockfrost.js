import { BlockfrostProvider } from "@meshsdk/core";

async function testBlockfrost() {
  try {
    console.log("Testing Blockfrost connection...");
    
    const provider = new BlockfrostProvider(
      "preprod",
      process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5"
    );
    
    console.log("Provider created successfully");
    
    // Test with a simple query first
    const scriptAddr = "addr_test1wz9vanf0yq47gckhyp6kj6f74pd73je0uwsn0sa6u5pcpfcn52cn7";
    console.log("Fetching UTXOs from:", scriptAddr);
    
    const utxos = await provider.fetchUTxOs(scriptAddr);
    console.log("Success! Found", utxos.length, "UTXOs");
    
    utxos.forEach((utxo, i) => {
      console.log(`UTXO ${i}:`, {
        txHash: utxo.input.txHash,
        outputIndex: utxo.input.outputIndex,
        amount: utxo.output.amount
      });
    });
    
  } catch (error) {
    console.error("Detailed error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

testBlockfrost();
