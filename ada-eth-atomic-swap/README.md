# ADA→ETH Atomic Swap (HTLC)

This folder contains a full example of an atomic swap from ADA to ETH using Hashed Timelock Contracts (HTLC) on both Cardano and Ethereum.

## Structure

- `ethereum/` — Solidity contract and Foundry scripts for ETH side
- `cardano/` — Aiken validator and JS scripts for ADA side

---

## Cardano Side

### 1. Build the Validator

```sh
cd ada-eth-atomic-swap/cardano/escrow
# Build the validator (requires Aiken)
aiken build
# This will generate reverse_plutus.json
```

### 2. Prepare Wallets

Generate credentials if needed (copy or use your existing `owner.sk` and `beneficiary.sk` in `ada-eth-atomic-swap/cardano/`).

### 3. Lock ADA

```sh
cd ../../
# Set your Blockfrost API key in .env
export BLOCKFROST_API_KEY=your_blockfrost_key
bun run reverse_lock.js
```

### 4. Unlock ADA (with secret)

```sh
bun run reverse_unlock.js
```

---

## Ethereum Side

### 1. Build and Deploy the Contract

```sh
cd ada-eth-atomic-swap/ethereum
forge build
forge script script/ReverseDeploy.sol \
  --rpc-url <YOUR_ETH_RPC_URL> \
  --private-key <YOUR_PRIVATE_KEY> \
  --broadcast
```

### 2. Withdraw ETH (with secret)

Edit `script/ReverseWithdraw.sol` to set the deployed contract address and secret, then run:

```sh
forge script script/ReverseWithdraw.sol \
  --rpc-url <YOUR_ETH_RPC_URL> \
  --private-key <YOUR_PRIVATE_KEY> \
  --broadcast
```

---

## Notes
- The same hash/preimage is used on both chains for atomicity.
- Timelocks and amounts are hardcoded for demo purposes; adjust as needed.
- Make sure to use the correct secret and contract addresses in your scripts.

---

Happy swapping! 