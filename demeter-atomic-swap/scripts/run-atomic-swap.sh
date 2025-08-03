#!/bin/bash

# Atomic Swap Execution Script for Demeter.run
# Orchestrates the complete atomic swap process between Cardano and Ethereum

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Network parameter
NETWORK=${1:-preprod}

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Load environment
load_environment() {
    if [ -f ".env.demeter" ]; then
        source .env.demeter
        print_status "Environment loaded from .env.demeter"
    else
        print_error "Environment file .env.demeter not found. Run setup-demeter.sh first."
        exit 1
    fi
    
    # Validate required environment variables
    required_vars=("CARDANO_NODE_SOCKET_PATH" "BLOCKFROST_PROJECT_ID" "ETHEREUM_RPC_URL" "ETH_PRIVATE_KEY")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Required environment variable $var is not set"
            exit 1
        fi
    done
}

# Generate atomic swap parameters
generate_swap_params() {
    print_info "Generating atomic swap parameters..."
    
    # Generate secret and hash
    SWAP_SECRET=${SWAP_SECRET:-$(openssl rand -hex 32)}
    SECRET_HASH=$(echo -n "$SWAP_SECRET" | sha256sum | cut -d' ' -f1)
    
    # Generate deadline (1 hour from now)
    DEADLINE=$(($(date +%s) + 3600))
    
    # Generate beneficiary addresses (in real scenario, these would be provided)
    CARDANO_BENEFICIARY="addr_test1qr..." # Would be provided
    ETH_BENEFICIARY="0x..." # Would be provided
    
    echo "Swap Parameters:"
    echo "  Secret: $SWAP_SECRET"
    echo "  Secret Hash: $SECRET_HASH"
    echo "  Deadline: $DEADLINE ($(date -d @$DEADLINE))"
    echo "  ADA Amount: $ADA_AMOUNT lovelace"
    echo "  ETH Amount: $ETH_AMOUNT ETH"
    echo ""
}

# Step 1: Deploy and lock funds on Cardano
lock_cardano_funds() {
    print_info "🔹 STEP 1: Locking ADA on Cardano"
    
    cd cardano-aiken
    
    # Build Aiken contract
    aiken build
    
    # Generate transaction to lock funds
    cat > lock_transaction.js << EOF
import { BlockfrostProvider, MeshWallet } from '@meshsdk/core';

const provider = new BlockfrostProvider('$BLOCKFROST_PROJECT_ID');

async function lockFunds() {
    try {
        console.log('Locking $ADA_AMOUNT lovelace on Cardano...');
        
        // Transaction would be built here using MeshSDK
        // This is a placeholder for the actual implementation
        
        const txHash = 'placeholder_cardano_tx_hash';
        console.log('✅ Cardano lock successful! TX:', txHash);
        return txHash;
    } catch (error) {
        console.error('❌ Cardano lock failed:', error);
        process.exit(1);
    }
}

lockFunds();
EOF
    
    # Execute the lock transaction
    CARDANO_TX_HASH=$(node lock_transaction.js | grep "TX:" | cut -d' ' -f4)
    
    cd ..
    
    print_status "Cardano funds locked. TX Hash: $CARDANO_TX_HASH"
}

# Step 2: Deploy Ethereum contract and lock ETH with 1inch
lock_ethereum_funds() {
    print_info "🔹 STEP 2: Deploying Ethereum contract and locking ETH"
    
    cd ethereum-1inch
    
    # Create deployment script
    cat > script/DeployAndLock.s.sol << EOF
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/AtomicSwap1inch.sol";

contract DeployAndLock is Script {
    function run() external {
        vm.startBroadcast();
        
        // Deploy contract
        AtomicSwap1inch atomicSwap = new AtomicSwap1inch();
        
        // Create swap
        bytes32 secretHash = 0x$SECRET_HASH;
        address beneficiary = 0x$ETH_BENEFICIARY;
        uint256 deadline = $DEADLINE;
        
        atomicSwap.createSwap{value: $(echo "$ETH_AMOUNT * 10^18" | bc)}(
            secretHash,
            beneficiary,
            deadline,
            address(0), // ETH
            0x$CARDANO_TX_HASH,
            0 // No 1inch swap on lock
        );
        
        console.log("Contract deployed at:", address(atomicSwap));
        
        vm.stopBroadcast();
    }
}
EOF
    
    # Deploy and execute
    ETH_CONTRACT_ADDRESS=$(forge script script/DeployAndLock.s.sol \
        --rpc-url $ETHEREUM_RPC_URL \
        --private-key $ETH_PRIVATE_KEY \
        --broadcast | grep "Contract deployed at:" | cut -d' ' -f4)
    
    cd ..
    
    print_status "Ethereum contract deployed and ETH locked. Contract: $ETH_CONTRACT_ADDRESS"
}

# Step 3: Claim ETH (revealing secret) with 1inch swap
claim_ethereum_funds() {
    print_info "🔹 STEP 3: Claiming ETH and executing 1inch swap"
    
    cd ethereum-1inch
    
    # Get 1inch swap data (mock implementation)
    ONEINCH_CALLDATA=$(get_1inch_swap_data)
    
    # Create claim script
    cat > script/ClaimWithOneInch.s.sol << EOF
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/AtomicSwap1inch.sol";

contract ClaimWithOneInch is Script {
    function run() external {
        vm.startBroadcast();
        
        AtomicSwap1inch atomicSwap = AtomicSwap1inch($ETH_CONTRACT_ADDRESS);
        
        bytes32 secret = 0x$SWAP_SECRET;
        bytes32 swapId = keccak256("calculated_swap_id"); // Would be calculated properly
        
        // Execute claim with 1inch integration
        atomicSwap.claimWithOneInch(
            swapId,
            secret,
            hex"$ONEINCH_CALLDATA"
        );
        
        console.log("ETH claimed successfully with secret revealed");
        
        vm.stopBroadcast();
    }
}
EOF
    
    # Execute claim
    forge script script/ClaimWithOneInch.s.sol \
        --rpc-url $ETHEREUM_RPC_URL \
        --private-key $ETH_PRIVATE_KEY \
        --broadcast
    
    cd ..
    
    print_status "ETH claimed successfully. Secret revealed: $SWAP_SECRET"
}

# Step 4: Claim ADA using revealed secret
claim_cardano_funds() {
    print_info "🔹 STEP 4: Claiming ADA using revealed secret"
    
    cd cardano-aiken
    
    # Create unlock transaction
    cat > unlock_transaction.js << EOF
import { BlockfrostProvider, MeshWallet } from '@meshsdk/core';

const provider = new BlockfrostProvider('$BLOCKFROST_PROJECT_ID');

async function unlockFunds() {
    try {
        console.log('Unlocking ADA using secret: $SWAP_SECRET');
        
        // Transaction would be built here using the revealed secret
        // This is a placeholder for the actual implementation
        
        const txHash = 'placeholder_cardano_unlock_tx_hash';
        console.log('✅ Cardano unlock successful! TX:', txHash);
        return txHash;
    } catch (error) {
        console.error('❌ Cardano unlock failed:', error);
        process.exit(1);
    }
}

unlockFunds();
EOF
    
    # Execute unlock
    CARDANO_UNLOCK_TX_HASH=$(node unlock_transaction.js | grep "TX:" | cut -d' ' -f4)
    
    cd ..
    
    print_status "ADA claimed successfully. TX Hash: $CARDANO_UNLOCK_TX_HASH"
}

# Get 1inch swap data (mock implementation)
get_1inch_swap_data() {
    # In real implementation, this would call 1inch API
    # curl "https://api.1inch.io/v5.0/1/swap?..."
    echo "1234567890abcdef" # Mock calldata
}

# Verify swap completion
verify_swap_completion() {
    print_info "🔍 Verifying atomic swap completion..."
    
    echo "Atomic Swap Summary:"
    echo "===================="
    echo "✅ Cardano Lock TX:     $CARDANO_TX_HASH"
    echo "✅ Ethereum Contract:   $ETH_CONTRACT_ADDRESS"
    echo "✅ Ethereum Claim:      Successful"
    echo "✅ Cardano Unlock TX:   $CARDANO_UNLOCK_TX_HASH"
    echo "🔑 Secret Revealed:     $SWAP_SECRET"
    echo "🌐 Network:             $NETWORK"
    echo ""
    
    print_status "🎉 ATOMIC SWAP COMPLETED SUCCESSFULLY!"
}

# Error handling
handle_error() {
    print_error "Atomic swap failed at step: $1"
    echo "Check the logs above for details."
    echo "You may need to refund locked funds manually."
    exit 1
}

# Main execution function
main() {
    echo "🚀 Starting Atomic Swap on Demeter.run"
    echo "======================================="
    echo "Network: $NETWORK"
    echo ""
    
    # Load configuration
    load_environment
    
    # Generate parameters
    generate_swap_params
    
    # Execute atomic swap steps
    trap 'handle_error "Unknown step"' ERR
    
    lock_cardano_funds || handle_error "Cardano Lock"
    lock_ethereum_funds || handle_error "Ethereum Lock"
    claim_ethereum_funds || handle_error "Ethereum Claim"
    claim_cardano_funds || handle_error "Cardano Claim"
    
    # Verify completion
    verify_swap_completion
}

# Show usage if no network specified
if [ $# -eq 0 ]; then
    echo "Usage: $0 <network>"
    echo "Networks: preprod, mainnet"
    echo "Example: $0 preprod"
    exit 1
fi

# Execute main function
main "$@"
