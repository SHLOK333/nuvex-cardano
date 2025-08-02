import { MeshWallet } from "@meshsdk/core";

// Generate a secret key for the owner wallet and beneficiary wallet
const owner_secret_key = MeshWallet.brew(true);
const beneficiary_secret_key = MeshWallet.brew(true);

//Save secret keys to files
Bun.write("owner.sk", owner_secret_key);
Bun.write("beneficiary.sk", beneficiary_secret_key);

const owner_wallet = new MeshWallet({
  networkId: 0,
  key: {
    type: "root",
    bech32: owner_secret_key,
  },
});

const beneficiary_wallet = new MeshWallet({
  networkId: 0,
  key: {
    type: "root",
    bech32: beneficiary_secret_key,
  },
});

// Save unused addresses to files
Bun.write("owner.addr", (await owner_wallet.getUnusedAddresses())[0]);
Bun.write(
  "beneficiary.addr",
  (await beneficiary_wallet.getUnusedAddresses())[0],
);
