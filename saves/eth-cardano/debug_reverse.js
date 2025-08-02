import {
  MeshTxBuilder,
  serializePlutusScript,
} from "@meshsdk/core";
import { applyParamsToScript } from "@meshsdk/core-csl";
import fs from "fs";

// Use existing setup from common.js
import { blockchainProvider } from "./common.js";

// Load reverse validator
const reverseBlueprint = JSON.parse(fs.readFileSync("../ada-eth-atomic-swap/cardano/escrow/reverse_validator/reverse_plutus.json"));
const reverseScriptCbor = applyParamsToScript(
  reverseBlueprint.validators[0].compiledCode,
  [
    "290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563",
    3000000000000,
  ],
);
const reverseScriptAddr = serializePlutusScript(
  { code: reverseScriptCbor, version: "V3" },
  undefined,
  0,
).address;

async function debug() {
  console.log("Reverse Script Address:", reverseScriptAddr);
  console.log("Target Transaction Hash:", "64a52a76d244763073fd636800b9563fc5d49b3cd3e45240037f203ca5e238a8");
  
  try {
    // Try fetching UTXOs from the script address
    console.log("\nAttempting to fetch UTXOs from script address...");
    const utxos = await blockchainProvider.fetchUTxOs(reverseScriptAddr);
    console.log("Found", utxos.length, "UTXOs at script address");
    
    if (utxos.length > 0) {
      utxos.forEach((utxo, index) => {
        console.log(`UTXO ${index}:`, {
          txHash: utxo.input.txHash,
          outputIndex: utxo.input.outputIndex,
          amount: utxo.output.amount
        });
      });
    }
  } catch (error) {
    console.error("Error fetching UTXOs:", error);
    
    // Try alternative method - fetch transaction details
    try {
      console.log("\nTrying to fetch transaction details directly...");
      const txDetails = await blockchainProvider.fetchTxInfo("64a52a76d244763073fd636800b9563fc5d49b3cd3e45240037f203ca5e238a8");
      console.log("Transaction found:", txDetails);
    } catch (txError) {
      console.error("Error fetching transaction:", txError);
      console.log("Transaction might not be confirmed yet or there might be an API issue.");
    }
  }
}

debug().catch(console.error);
