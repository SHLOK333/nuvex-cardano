import "dotenv/config";
import {
  MeshWallet,
  BlockfrostProvider,
  MeshTxBuilder,
  serializePlutusScript,
} from "@meshsdk/core";
import { applyParamsToScript } from "@meshsdk/core-csl";
import fs from "fs";

export const blockchainProvider = new BlockfrostProvider(
  process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5",
);

export const owner_wallet = new MeshWallet({
  networkId: 0,
  fetcher: blockchainProvider,
  submitter: blockchainProvider,
  key: {
    type: "root",
    bech32: fs.readFileSync("owner.sk").toString(),
  },
});

export const beneficiary_wallet = new MeshWallet({
  networkId: 0,
  fetcher: blockchainProvider,
  submitter: blockchainProvider,
  key: {
    type: "root",
    bech32: fs.readFileSync("beneficiary.sk").toString(),
  },
});

export function getTxBuilder() {
  return new MeshTxBuilder({
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    verbose: true,
  });
}

const blueprint = JSON.parse(fs.readFileSync("./escrow/reverse_plutus.json"));
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
  0,
).address;