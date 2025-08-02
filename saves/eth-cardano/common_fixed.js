import dotenv from "dotenv";
import {
  MeshWallet,
  BlockfrostProvider,
  MeshTxBuilder,
  serializePlutusScript,
} from "@meshsdk/core";
import { applyParamsToScript } from "@meshsdk/core-csl";
import fs from "fs";

// Load environment from parent directory
dotenv.config({ path: "../.env" });

const blockchainProvider = new BlockfrostProvider(
  "preprod",
  process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5"
);

export { blockchainProvider };

export const owner_wallet = new MeshWallet({
  networkId: 0, // 0 = testnet, 1 = mainnet
  fetcher: blockchainProvider,
  submitter: blockchainProvider,
  key: {
    type: "root",
    bech32: fs.readFileSync("owner.sk").toString().trim(),
  },
});

export const beneficiary_wallet = new MeshWallet({
  networkId: 0, // 0 = testnet, 1 = mainnet
  fetcher: blockchainProvider,
  submitter: blockchainProvider,
  key: {
    type: "root",
    bech32: fs.readFileSync("beneficiary.sk").toString().trim(),
  },
});

// Workaround for MeshSDK UTXO fetching bug
export async function getWalletUtxos(wallet) {
  try {
    // First try the normal MeshSDK method
    const utxos = await wallet.getUtxos();
    if (utxos && utxos.length > 0) {
      return utxos;
    }
    
    // If that fails, use direct provider
    const address = await wallet.getChangeAddress();
    const directUtxos = await blockchainProvider.fetchUTxOs(address);
    return directUtxos;
  } catch (error) {
    console.error("Error fetching UTXOs:", error.message);
    return [];
  }
}

// Workaround function to get wallet balance
export async function getWalletBalance(wallet) {
  const utxos = await getWalletUtxos(wallet);
  let total = 0;
  
  for (const utxo of utxos) {
    for (const amount of utxo.amount) {
      if (amount.unit === "lovelace") {
        total += parseInt(amount.quantity);
      }
    }
  }
  
  return total;
}

// Initialize addresses by calling getUtxos() once
async function initializeWallets() {
  try {
    await owner_wallet.getUtxos();
    await beneficiary_wallet.getUtxos();
  } catch (error) {
    // Ignore errors, just trying to initialize addresses
  }
}

// Call initialization
initializeWallets();

export function getTxBuilder() {
  return new MeshTxBuilder({
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    verbose: true,
    networkId: 0, // 0 = testnet, 1 = mainnet
  });
}

const blueprint = JSON.parse(fs.readFileSync("./escrow/plutus.json"));
export const scriptCbor = applyParamsToScript(
  blueprint.validators[0].compiledCode,
  []
);

export const scriptAddress = serializePlutusScript(
  { code: scriptCbor, version: "V3" },
  undefined,
  0
).address;
