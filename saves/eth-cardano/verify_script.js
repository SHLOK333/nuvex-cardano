// Test script to verify our lock transaction and script address
import fs from "fs";
import { applyParamsToScript } from "@meshsdk/core-csl";
import { serializePlutusScript } from "@meshsdk/core";

console.log("=== Verifying Script Address ===");

// Load reverse validator (same as in reverse_unlock.js)
const reverseBlueprint = JSON.parse(fs.readFileSync("../ada-eth-atomic-swap/cardano/escrow/reverse_validator/reverse_plutus.json"));
console.log("Loaded reverse blueprint with", reverseBlueprint.validators.length, "validators");

const reverseScriptCbor = applyParamsToScript(
  reverseBlueprint.validators[0].compiledCode,
  [
    "290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563",
    3000000000000,
  ],
);
console.log("Applied parameters to script");

const reverseScriptAddr = serializePlutusScript(
  { code: reverseScriptCbor, version: "V3" },
  undefined,
  0,
).address;

console.log("Reverse script address:", reverseScriptAddr);

// Also check the regular escrow script address for comparison
const blueprint = JSON.parse(fs.readFileSync("./escrow/plutus.json"));
const scriptCbor = applyParamsToScript(
  blueprint.validators[0].compiledCode,
  [
    "290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563",
    3000000000000,
  ],
);
const scriptAddr = serializePlutusScript(
  { code: scriptCbor, version: "V3" },
  undefined,
  0,
).address;

console.log("Regular script address:", scriptAddr);

console.log("\n=== Lock Transaction Hash ===");
console.log("Target tx: 64a52a76d244763073fd636800b9563fc5d49b3cd3e45240037f203ca5e238a8");

console.log("\n=== Expected Address Match ===");
console.log("Lock was sent to: addr_test1wz9vanf0yq47gckhyp6kj6f74pd73je0uwsn0sa6u5pcpfcn52cn7");
console.log("Reverse script:  ", reverseScriptAddr);
console.log("Addresses match:", reverseScriptAddr === "addr_test1wz9vanf0yq47gckhyp6kj6f74pd73je0uwsn0sa6u5pcpfcn52cn7");
