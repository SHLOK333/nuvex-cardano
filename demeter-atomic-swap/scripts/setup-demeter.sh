#!/bin/bash

# Demeter.run Setup Script for Atomic Swap
# This script sets up the environment for running atomic swaps on Demeter.run

set -e

echo "🚀 Setting up Demeter.run Atomic Swap Environment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running on Demeter.run
check_demeter_environment() {
    print_info "Checking Demeter.run environment..."
    
    if [ -z "$CARDANO_NODE_SOCKET_PATH" ]; then
        print_error "CARDANO_NODE_SOCKET_PATH not set. Are you running on Demeter.run?"
        exit 1
    fi
    
    if [ ! -S "$CARDANO_NODE_SOCKET_PATH" ]; then
        print_error "Cardano node socket not found at $CARDANO_NODE_SOCKET_PATH"
        exit 1
    fi
    
    print_status "Demeter.run environment detected"
}

# Install system dependencies
install_dependencies() {
    print_info "Installing system dependencies..."
    
    # Update package list
    sudo apt-get update -qq
    
    # Install required packages
    sudo apt-get install -y \
        curl \
        git \
        build-essential \
        jq \
        bc \
        nodejs \
        npm
    
    print_status "System dependencies installed"
}

# Install Haskell and Plutus dependencies
setup_haskell() {
    print_info "Setting up Haskell environment..."
    
    # Install GHCup if not present
    if ! command -v ghcup &> /dev/null; then
        curl --proto '=https' --tlsv1.2 -sSf https://get-ghcup.haskell.org | sh
        source ~/.ghcup/env
    fi
    
    # Install specific GHC and Cabal versions for Plutus compatibility
    ghcup install ghc 8.10.7
    ghcup set ghc 8.10.7
    ghcup install cabal 3.6.2.0
    ghcup set cabal 3.6.2.0
    
    # Install Stack
    if ! command -v stack &> /dev/null; then
        curl -sSL https://get.haskellstack.org/ | sh
    fi
    
    print_status "Haskell environment configured"
}

# Install Aiken
setup_aiken() {
    print_info "Installing Aiken..."
    
    if ! command -v aiken &> /dev/null; then
        curl -sSf https://install.aiken-lang.org | bash
        export PATH="$HOME/.aiken/bin:$PATH"
        echo 'export PATH="$HOME/.aiken/bin:$PATH"' >> ~/.bashrc
    fi
    
    print_status "Aiken installed"
}

# Setup Node.js and npm packages
setup_nodejs() {
    print_info "Setting up Node.js environment..."
    
    # Install Node.js 18 (LTS)
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Install global packages
    npm install -g \
        @meshsdk/cli \
        typescript \
        ts-node
    
    print_status "Node.js environment configured"
}

# Install Foundry for Ethereum development
setup_foundry() {
    print_info "Installing Foundry..."
    
    if ! command -v forge &> /dev/null; then
        curl -L https://foundry.paradigm.xyz | bash
        source ~/.bashrc
        foundryup
    fi
    
    print_status "Foundry installed"
}

# Setup project dependencies
setup_project_deps() {
    print_info "Setting up project dependencies..."
    
    # Haskell project
    if [ -d "cardano-haskell" ]; then
        cd cardano-haskell
        cabal update
        cabal build --dependencies-only
        cd ..
        print_status "Haskell dependencies installed"
    fi
    
    # Aiken project
    if [ -d "cardano-aiken" ]; then
        cd cardano-aiken
        aiken check
        cd ..
        print_status "Aiken project validated"
    fi
    
    # Ethereum project
    if [ -d "ethereum-1inch" ]; then
        cd ethereum-1inch
        forge install OpenZeppelin/openzeppelin-contracts
        forge install 1inch/1inch-contracts
        forge build
        cd ..
        print_status "Ethereum dependencies installed"
    fi
}

# Configure Cardano CLI
setup_cardano_cli() {
    print_info "Configuring Cardano CLI..."
    
    # Set network parameters based on Demeter.run environment
    NETWORK=${CARDANO_NETWORK:-"preprod"}
    
    if [ "$NETWORK" = "mainnet" ]; then
        export CARDANO_CLI_NETWORK="--mainnet"
        export BLOCKFROST_URL="https://cardano-mainnet.blockfrost.io/api/v0"
    else
        export CARDANO_CLI_NETWORK="--testnet-magic 1"
        export BLOCKFROST_URL="https://cardano-preprod.blockfrost.io/api/v0"
    fi
    
    # Add to bashrc for persistence
    echo "export CARDANO_CLI_NETWORK=\"$CARDANO_CLI_NETWORK\"" >> ~/.bashrc
    echo "export BLOCKFROST_URL=\"$BLOCKFROST_URL\"" >> ~/.bashrc
    
    # Test Cardano CLI connectivity
    cardano-cli query tip $CARDANO_CLI_NETWORK
    
    print_status "Cardano CLI configured for $NETWORK"
}

# Create environment configuration
create_env_config() {
    print_info "Creating environment configuration..."
    
    cat > .env.demeter << EOF
# Demeter.run Environment Configuration
CARDANO_NODE_SOCKET_PATH=$CARDANO_NODE_SOCKET_PATH
CARDANO_NETWORK=${CARDANO_NETWORK:-preprod}
BLOCKFROST_PROJECT_ID=${BLOCKFROST_PROJECT_ID:-your_blockfrost_project_id}
BLOCKFROST_URL=${BLOCKFROST_URL}

# Ethereum Configuration (configure these)
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key
ONEINCH_API_KEY=your_1inch_api_key

# Atomic Swap Configuration
SWAP_SECRET=0x68656c6c6f
ADA_AMOUNT=3000000
ETH_AMOUNT=0.001

# MEV Protection
MAX_SLIPPAGE_BPS=50
MIN_GAS_PRICE=10000000000
MAX_GAS_PRICE=100000000000
EOF
    
    print_warning "Please edit .env.demeter with your actual API keys and private keys"
    print_status "Environment configuration created"
}

# Main setup function
main() {
    echo "Starting Demeter.run setup..."
    
    check_demeter_environment
    install_dependencies
    setup_haskell
    setup_aiken
    setup_nodejs
    setup_foundry
    setup_project_deps
    setup_cardano_cli
    create_env_config
    
    echo ""
    echo "🎉 Setup completed successfully!"
    echo "=================================================="
    echo ""
    echo "Next steps:"
    echo "1. Edit .env.demeter with your API keys and private keys"
    echo "2. Run: source .env.demeter"
    echo "3. Execute: ./scripts/run-atomic-swap.sh preprod"
    echo ""
    print_warning "Remember to keep your private keys secure and never commit them to git!"
}

# Run main function
main "$@"
