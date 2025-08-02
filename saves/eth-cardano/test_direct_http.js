import dotenv from "dotenv";

// Load environment from parent directory
dotenv.config({ path: "../.env" });

async function testDirectHTTP() {
    console.log("🌐 Testing Direct HTTP Blockfrost Call...\n");
    
    const apiKey = process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
    const ownerAddress = "addr_test1qqhlxua3c9rrqyvce7l744wajtguwdcmn6kzf37gm0p4cahxf4mug86n3whyyanpqtj4s57ta4ttkqpn9mzquqcq6pls0tdvj6";
    
    const url = `https://cardano-preprod.blockfrost.io/api/v0/addresses/${ownerAddress}/utxos`;
    
    console.log("API Key:", apiKey);
    console.log("URL:", url);
    
    try {
        const response = await fetch(url, {
            headers: {
                'project_id': apiKey
            }
        });
        
        console.log("Response status:", response.status);
        console.log("Response statusText:", response.statusText);
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Success! Found", data.length, "UTXOs");
            
            if (data.length > 0) {
                console.log("UTXO 0:", JSON.stringify(data[0], null, 2));
            }
        } else {
            const errorText = await response.text();
            console.error("❌ HTTP Error:", errorText);
        }
    } catch (error) {
        console.error("❌ Fetch error:", error.message);
    }
}

testDirectHTTP().catch(console.error);
