#!/bin/bash

# Load environment variables from .env file
set -a
source ../.env
set +a

# Set the recipient address (beneficiary from Cardano)
export RECIPIENT_ADDRESS="0xe185a249e622274f3ad1538229a9c579a9e8fc427d93a7d62e8e3ab5"

echo "🚀 ETHEREUM TIMELOCK DEPLOYMENT"
echo "════════════════════════════════"
echo "RPC URL: $SEPOLIA_RPC_URL"
echo "Recipient: $RECIPIENT_ADDRESS"
echo "Private Key: ${ETH_PRIVATE_KEY:0:10}..."
echo "Secret: $SECRET"
echo ""

# Deploy the timelock contract
echo "📤 Deploying timelock contract..."
forge script script/TimelockDeploy.sol:TimelockDeploy \
  --rpc-url "$SEPOLIA_RPC_URL" \
  --private-key "$ETH_PRIVATE_KEY" \
  --broadcast \
  --verify \
  --etherscan-api-key "$ETHERSCAN_API_KEY" \
  -v

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔗 Next steps:"
echo "   1. Check the contract on Sepolia Etherscan"
echo "   2. Use TimelockWithdraw script to unlock with secret"
echo "   3. Proceed with Cardano unlock using the same secret"
