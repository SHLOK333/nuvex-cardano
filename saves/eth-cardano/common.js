import dotenv from "dotenv";
import {
  MeshWallet,
  BlockfrostProvider,
  MeshTxBuilder,
  serializePlutusScript,
} from "@meshsdk/core";
import { applyParamsToScript } from "@meshsdk/core-csl";
import fs, { read } from "fs";

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
  const builder = new MeshTxBuilder({
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    verbose: true,
    networkId: 0, // 0 = testnet, 1 = mainnet
  });
  
  // Explicitly set the network ID if not set
  if (builder.networkId === undefined) {
    builder.networkId = 0;
  }
  
  // Force preprod configuration (not testnet)
  if (builder.meshTxBuilderBody) {
    builder.meshTxBuilderBody.network = "preprod";
  }
  
  return builder;
}

const blueprint = JSON.parse(fs.readFileSync("./escrow/plutus.json"));
export const scriptCbor = applyParamsToScript(
  blueprint.validators[0].compiledCode,
  [
    "290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563",
    3000000000000,
  ],
);
export const scriptAddr = serializePlutusScript(
  { code: scriptCbor, version: "V3" },
  undefined,
  0, // 0 = testnet, 1 = mainnet
).address;
