
# 🚀 NUVEX CARDANO - Advanced Cross-Chain Atomic Swap Infrastructure

> **Complete bidirectional atomic swap system between Cardano and Ethereum with 1inch Protocol integration, MEV protection, and advanced DeFi capabilities.**

## 📺 **Demo Video**

https://github.com/user-attachments/assets/6d791ecd-8aec-4750-8e8c-4aaef0f49bac

*Fully functional atomic swaps demonstration*

---

## 🏗️ **Project Architecture Overview**

This repository contains a complete ecosystem for cross-chain atomic swaps with multiple implementation approaches and advanced features.

```mermaid
graph TB
    subgraph "🎯 Main Project Components"
        MAIN[NUVEX-CARDANO<br/>Main Repository]
        ADA_ETH[ada-eth-atomic-swap/<br/>Standard Implementation]
        DEMETER[demeter-atomic-swap/<br/>Cloud Infrastructure]
        CARDANO[cardano/<br/>Core Cardano Integration]
        ETHEREUM[ethereum/<br/>Core Ethereum Integration]
    end

    subgraph "🔄 Bidirectional Swap Flows"
        ETH_TO_ADA[ETH → ADA<br/>Ethereum to Cardano]
        ADA_TO_ETH[ADA → ETH<br/>Cardano to Ethereum]
        PARTIAL[Partial Filling<br/>Advanced Order Types]
    end

    subgraph "🛡️ Advanced Features"
        ONEINCH[1inch Integration<br/>Optimal Liquidity]
        MEV[MEV Protection<br/>Front-running Defense]
        ESCROW[Smart Escrow<br/>Trustless Execution]
    end

    MAIN --> ADA_ETH
    MAIN --> DEMETER
    MAIN --> CARDANO
    MAIN --> ETHEREUM
    
    ADA_ETH --> ETH_TO_ADA
    ADA_ETH --> ADA_TO_ETH
    DEMETER --> PARTIAL
    
    ETHEREUM --> ONEINCH
    ETHEREUM --> MEV
    CARDANO --> ESCROW

    classDef mainStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:3px
    classDef swapStyle fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef featureStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class MAIN,ADA_ETH,DEMETER,CARDANO,ETHEREUM mainStyle
    class ETH_TO_ADA,ADA_TO_ETH,PARTIAL swapStyle
    class ONEINCH,MEV,ESCROW featureStyle
```

---

## � **Cross-Chain Escrow Integration**

### **How Solidity Escrow Connects with Cardano**

The project implements sophisticated cross-chain escrow mechanisms using Hash Time Locked Contracts (HTLCs) and 1inch protocol integration.

```mermaid
graph TB
    subgraph "⛓️ Ethereum Side (Solidity)"
        ETH_ESCROW[EscrowSrc.sol<br/>Basic Escrow Contract]
        ATOMIC_1INCH[AtomicSwap1inch.sol<br/>Advanced 1inch Integration]
        TIMELOCK[TimelockDeploy.sol<br/>Time-based Security]
        
        subgraph "🔧 Solidity Components"
            CREATE_SWAP[createSwap()<br/>Lock ETH/ERC20]
            CLAIM_1INCH[claimWithOneInch()<br/>Execute + 1inch swap]
            REFUND_ETH[refund()<br/>Timeout recovery]
            VALIDATE_SECRET[Secret validation<br/>keccak256(secret)]
        end
        
        subgraph "🌟 1inch Integration Points"
            ROUTER_CALL[1inch Router Call<br/>Optimal liquidity]
            MEV_PROTECTION[MEV Protection<br/>Gas + Slippage limits]
            PARTIAL_FILLS[Partial Execution<br/>Large order splitting]
        end
    end
    
    subgraph "🔄 Cross-Chain Bridge"
        SECRET_HASH[Shared Secret Hash<br/>SHA256/Keccak256]
        TIMELOCK_PARAMS[Timelock Parameters<br/>Deadline coordination]
        ORACLE_EVENTS[Cross-chain Events<br/>Status synchronization]
    end
    
    subgraph "🏛️ Cardano Side (Aiken/Haskell)"
        ADA_ESCROW[escrow.ak<br/>Aiken Validator]
        PLUTUS_CONTRACT[AtomicSwap.hs<br/>Plutus Contract]
        REVERSE_ESCROW[reverse_validator.ak<br/>Reverse Flow Handler]
        
        subgraph "🔐 Cardano Components"
            LOCK_ADA[Lock ADA<br/>UTXO creation]
            UNLOCK_ADA[Unlock ADA<br/>Secret revelation]
            REFUND_ADA[Refund ADA<br/>Timeout handling]
            VALIDATE_HASH[Hash validation<br/>Secret verification]
        end
        
        subgraph "🏗️ Cardano Integration"
            UTXO_MANAGEMENT[UTXO Management<br/>Datum/Redeemer logic]
            MESH_SDK[MeshSDK Integration<br/>Transaction building]
            BLOCKFROST[Blockfrost API<br/>Chain queries]
        end
    end
    
    subgraph "☁️ Demeter.run Infrastructure"
        DEMETER_NODE[Cardano Node<br/>Preprod/Mainnet]
        DEMETER_API[Blockfrost API<br/>Integrated access]
        DEMETER_IDE[VS Code + Aiken<br/>Development environment]
    end
    
    %% Cross-chain connections
    ETH_ESCROW --> SECRET_HASH
    ADA_ESCROW --> SECRET_HASH
    
    ATOMIC_1INCH --> TIMELOCK_PARAMS
    PLUTUS_CONTRACT --> TIMELOCK_PARAMS
    
    CREATE_SWAP --> ORACLE_EVENTS
    LOCK_ADA --> ORACLE_EVENTS
    
    %% 1inch integration
    CLAIM_1INCH --> ROUTER_CALL
    ROUTER_CALL --> MEV_PROTECTION
    MEV_PROTECTION --> PARTIAL_FILLS
    
    %% Cardano integrations
    ADA_ESCROW --> UTXO_MANAGEMENT
    PLUTUS_CONTRACT --> MESH_SDK
    MESH_SDK --> BLOCKFROST
    
    %% Demeter connections
    BLOCKFROST --> DEMETER_API
    ADA_ESCROW --> DEMETER_NODE
    PLUTUS_CONTRACT --> DEMETER_IDE

    classDef ethereumStyle fill:#e8f5e8,stroke:#2e7d32,stroke-width:3px
    classDef bridgeStyle fill:#fff3e0,stroke:#f57c00,stroke-width:3px
    classDef cardanoStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:3px
    classDef demeterStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px
    classDef componentStyle fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef integrationStyle fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    
    class ETH_ESCROW,ATOMIC_1INCH,TIMELOCK ethereumStyle
    class SECRET_HASH,TIMELOCK_PARAMS,ORACLE_EVENTS bridgeStyle
    class ADA_ESCROW,PLUTUS_CONTRACT,REVERSE_ESCROW cardanoStyle
    class DEMETER_NODE,DEMETER_API,DEMETER_IDE demeterStyle
    class CREATE_SWAP,CLAIM_1INCH,REFUND_ETH,VALIDATE_SECRET,LOCK_ADA,UNLOCK_ADA,REFUND_ADA,VALIDATE_HASH componentStyle
    class ROUTER_CALL,MEV_PROTECTION,PARTIAL_FILLS,UTXO_MANAGEMENT,MESH_SDK,BLOCKFROST integrationStyle
```

### **Timelock and Hashlock Mechanics**

```mermaid
graph LR
    subgraph "🔐 Hashlock Mechanism"
        SECRET[Secret (32 bytes)<br/>Random preimage]
        HASH_ETH[ETH Hash<br/>keccak256(secret)]
        HASH_ADA[ADA Hash<br/>sha256(secret)]
        
        SECRET --> HASH_ETH
        SECRET --> HASH_ADA
    end
    
    subgraph "⏰ Timelock Mechanism"
        T0[T0: Swap Creation<br/>Both chains initialized]
        T1[T1: Lock Phase<br/>Funds locked on both sides]
        T2[T2: Reveal Phase<br/>Secret revealed on one chain]
        T3[T3: Claim Phase<br/>Secret used on other chain]
        T4[T4: Timeout<br/>Refund if not completed]
        
        T0 --> T1
        T1 --> T2
        T2 --> T3
        T1 -.-> T4
        T2 -.-> T4
    end
    
    subgraph "🔄 Cross-Chain Coordination"
        ETH_LOCK[ETH Locked<br/>With hashlock + timelock]
        ADA_LOCK[ADA Locked<br/>With same hash + timelock]
        SECRET_REVEAL[Secret Revealed<br/>On claiming chain]
        CROSS_CLAIM[Cross-chain Claim<br/>Using revealed secret]
        
        ETH_LOCK --> SECRET_REVEAL
        ADA_LOCK --> SECRET_REVEAL
        SECRET_REVEAL --> CROSS_CLAIM
    end

    classDef hashStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef timeStyle fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef coordStyle fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    
    class SECRET,HASH_ETH,HASH_ADA hashStyle
    class T0,T1,T2,T3,T4 timeStyle
    class ETH_LOCK,ADA_LOCK,SECRET_REVEAL,CROSS_CLAIM coordStyle
```

---

## 💻 **Solidity Code Integration with 1inch**

### **AtomicSwap1inch.sol - Core Implementation**

```mermaid
graph TB
    subgraph "📝 Contract Structure & Extensions"
        CONTRACT[AtomicSwap1inch.sol]
        
        subgraph "🛡️ OpenZeppelin Extensions"
            REENTRANCY[ReentrancyGuard<br/>import "@openzeppelin/contracts/security/ReentrancyGuard.sol"]
            OWNABLE[Ownable<br/>import "@openzeppelin/contracts/access/Ownable.sol"]
            IERC20[IERC20<br/>import "@openzeppelin/contracts/token/ERC20/IERC20.sol"]
            SAFEERC20[SafeERC20<br/>import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol"]
        end
        
        subgraph "🌟 1inch Protocol Interfaces"
            ROUTER_INTERFACE[IAggregationRouterV5<br/>Main 1inch router interface]
            ORDER_INTERFACE[IOrderMixin<br/>Order management interface]
            SWAP_DESC[SwapDescription<br/>Swap parameters struct]
            ORDER_STRUCT[Order<br/>1inch order structure]
        end
        
        subgraph "🏗️ Core Data Structures"
            ATOMIC_DATA[AtomicSwapData<br/>Complete swap state]
            MEV_PROTECTION[MevProtection<br/>Anti-MEV parameters]
            SWAP_STATUS[SwapStatus enum<br/>State management]
        end
        
        subgraph "⚡ Key Functions"
            CREATE_FUNC[createSwap()<br/>Initialize with MEV protection]
            CLAIM_FUNC[claimWithOneInch()<br/>Execute with 1inch optimization]
            REFUND_FUNC[refund()<br/>Timeout recovery]
            EXECUTE_1INCH[_executeOneInchSwap()<br/>Internal 1inch integration]
        end
    end
    
    CONTRACT --> REENTRANCY
    CONTRACT --> OWNABLE
    CONTRACT --> IERC20
    CONTRACT --> SAFEERC20
    
    CONTRACT --> ROUTER_INTERFACE
    CONTRACT --> ORDER_INTERFACE
    CONTRACT --> SWAP_DESC
    CONTRACT --> ORDER_STRUCT
    
    CONTRACT --> ATOMIC_DATA
    CONTRACT --> MEV_PROTECTION
    CONTRACT --> SWAP_STATUS
    
    CREATE_FUNC --> MEV_PROTECTION
    CLAIM_FUNC --> EXECUTE_1INCH
    EXECUTE_1INCH --> ROUTER_INTERFACE

    classDef contractStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:3px
    classDef ozStyle fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef oneinchStyle fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef dataStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef functionStyle fill:#ffebee,stroke:#c62828,stroke-width:2px
    
    class CONTRACT contractStyle
    class REENTRANCY,OWNABLE,IERC20,SAFEERC20 ozStyle
    class ROUTER_INTERFACE,ORDER_INTERFACE,SWAP_DESC,ORDER_STRUCT oneinchStyle
    class ATOMIC_DATA,MEV_PROTECTION,SWAP_STATUS dataStyle
    class CREATE_FUNC,CLAIM_FUNC,REFUND_FUNC,EXECUTE_1INCH functionStyle
```

### **1inch Integration Code Flow**

```mermaid
sequenceDiagram
    participant User
    participant AtomicSwap as AtomicSwap1inch.sol
    participant OneInch as 1inch Router V5
    participant Token as ERC20 Token
    participant Beneficiary

    Note over User,Beneficiary: Phase 1: Swap Creation
    User->>AtomicSwap: createSwap(secretHash, beneficiary, deadline, token, cardanoTxHash, minReturn)
    AtomicSwap->>AtomicSwap: _validateMevProtection(deadline)
    AtomicSwap->>Token: safeTransferFrom(user, contract, amount)
    AtomicSwap->>AtomicSwap: Store AtomicSwapData
    AtomicSwap->>User: Emit SwapCreated event

    Note over User,Beneficiary: Phase 2: 1inch Optimization & Claim
    Beneficiary->>AtomicSwap: claimWithOneInch(swapId, secret, oneinchCalldata)
    AtomicSwap->>AtomicSwap: Verify keccak256(secret) == secretHash
    AtomicSwap->>AtomicSwap: Check deadline & authorization
    
    Note over User,Beneficiary: Phase 3: 1inch Execution
    AtomicSwap->>Token: safeApprove(ONEINCH_ROUTER_V5, amount)
    AtomicSwap->>OneInch: call{value: ethAmount}(oneinchCalldata)
    OneInch->>OneInch: Execute optimal routing across DEXs
    OneInch->>AtomicSwap: Return (returnAmount, spentAmount)
    
    Note over User,Beneficiary: Phase 4: Final Transfer
    AtomicSwap->>AtomicSwap: Verify returnAmount >= oneinchMinReturn
    AtomicSwap->>Token: safeTransfer(beneficiary, returnAmount)
    AtomicSwap->>Beneficiary: Emit SwapClaimed & OneInchSwapExecuted
```

### **Extension Usage in Code**

```solidity
// File: AtomicSwap1inch.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// 🛡️ OpenZeppelin Security Extensions
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AtomicSwap1inch is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // 🌟 1inch Protocol Integration
    address public constant ONEINCH_ROUTER_V5 = 0x111111125421cA6dc452d289314280a0f8842A65;
    
    // 🔐 Hashlock Implementation
    mapping(bytes32 => AtomicSwapData) public swaps;
    
    // ⏰ Timelock with MEV Protection
    struct MevProtection {
        uint256 maxSlippageBps;     // 0.5% maximum slippage
        uint256 minGasPrice;        // 10 gwei minimum  
        uint256 maxGasPrice;        // 100 gwei maximum
        uint256 deadlineBuffer;     // 5 minutes buffer
    }
    
    // 🔄 Cross-chain Coordination
    struct AtomicSwapData {
        bytes32 secretHash;         // keccak256(secret) for Ethereum
        bytes32 cardanoTxHash;      // Cardano transaction coordination
        uint256 deadline;           // Unix timestamp timelock
        // ... other fields
    }
    
    // 🌟 1inch Integration Function
    function _executeOneInchSwap(
        AtomicSwapData memory swap,
        bytes calldata oneinchCalldata
    ) internal returns (uint256 returnAmount, uint256 spentAmount) {
        // Approve 1inch router
        if (swap.token != address(0)) {
            IERC20(swap.token).safeApprove(ONEINCH_ROUTER_V5, swap.amount);
        }
        
        // Execute 1inch aggregation
        (bool success, bytes memory result) = ONEINCH_ROUTER_V5.call{
            value: swap.token == address(0) ? swap.amount : 0
        }(oneinchCalldata);
        
        require(success, "1inch swap failed");
        // Verify minimum return for slippage protection
        require(returnAmount >= swap.oneinchMinReturn, "Insufficient return");
    }
}
```

---

## 🏛️ **Cardano Integration Architecture**

### **Aiken Validator Connection with Ethereum**

```mermaid
graph TB
    subgraph "🏗️ Cardano Smart Contract Layer"
        subgraph "⚡ Aiken Validators"
            ESCROW_AK[escrow.ak<br/>Main validator logic]
            REVERSE_AK[reverse_validator.ak<br/>Reverse flow handler]
            ATOMIC_AK[atomic_swap.ak<br/>Cross-chain coordinator]
        end
        
        subgraph "📜 Haskell Contracts"
            ATOMIC_HS[AtomicSwap.hs<br/>Plutus contract logic]
            ONEINCH_HS[OneInchIntegration.hs<br/>Cross-chain coordination]
        end
        
        subgraph "🔐 Hash & Time Logic"
            HASH_VALIDATION[Hash Validation<br/>sha256(secret) verification]
            TIMELOCK_VALIDATION[Timelock Validation<br/>Deadline checking]
            UTXO_MANAGEMENT[UTXO Management<br/>Datum/Redeemer logic]
        end
    end
    
    subgraph "🌉 Cross-Chain Bridge Logic"
        SECRET_COORDINATION[Secret Coordination<br/>Shared hash across chains]
        TIME_COORDINATION[Time Coordination<br/>Synchronized deadlines]
        EVENT_COORDINATION[Event Coordination<br/>Status synchronization]
    end
    
    subgraph "⛓️ Ethereum Integration Points"
        ETH_EVENTS[Ethereum Events<br/>SwapCreated, SwapClaimed]
        ORACLE_BRIDGE[Oracle Bridge<br/>Cross-chain communication]
        STATUS_SYNC[Status Synchronization<br/>Real-time updates]
    end
    
    subgraph "🔧 Development Tools"
        MESH_SDK[MeshSDK<br/>Transaction building]
        BLOCKFROST_API[Blockfrost API<br/>Chain queries]
        AIKEN_CLI[Aiken CLI<br/>Validator compilation]
    end
    
    %% Aiken connections
    ESCROW_AK --> HASH_VALIDATION
    REVERSE_AK --> TIMELOCK_VALIDATION
    ATOMIC_AK --> UTXO_MANAGEMENT
    
    %% Haskell connections
    ATOMIC_HS --> SECRET_COORDINATION
    ONEINCH_HS --> TIME_COORDINATION
    
    %% Cross-chain coordination
    SECRET_COORDINATION --> ETH_EVENTS
    TIME_COORDINATION --> ORACLE_BRIDGE
    EVENT_COORDINATION --> STATUS_SYNC
    
    %% Tool integrations
    UTXO_MANAGEMENT --> MESH_SDK
    HASH_VALIDATION --> BLOCKFROST_API
    ESCROW_AK --> AIKEN_CLI

    classDef aikenStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:3px
    classDef haskellStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef validationStyle fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef bridgeStyle fill:#fff3e0,stroke:#f57c00,stroke-width:3px
    classDef ethereumStyle fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef toolStyle fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    
    class ESCROW_AK,REVERSE_AK,ATOMIC_AK aikenStyle
    class ATOMIC_HS,ONEINCH_HS haskellStyle
    class HASH_VALIDATION,TIMELOCK_VALIDATION,UTXO_MANAGEMENT validationStyle
    class SECRET_COORDINATION,TIME_COORDINATION,EVENT_COORDINATION bridgeStyle
    class ETH_EVENTS,ORACLE_BRIDGE,STATUS_SYNC ethereumStyle
    class MESH_SDK,BLOCKFROST_API,AIKEN_CLI toolStyle
```

### **Demeter.run Cloud Infrastructure Integration**

```mermaid
graph TB
    subgraph "☁️ Demeter.run Platform"
        subgraph "🏗️ Infrastructure Components"
            DEMETER_NODE[Cardano Node<br/>Preprod/Mainnet access]
            DEMETER_BLOCKFROST[Blockfrost API<br/>Integrated blockchain queries]
            DEMETER_VSCODE[VS Code IDE<br/>Cloud development environment]
            DEMETER_AIKEN[Aiken Language Server<br/>Smart contract development]
        end
        
        subgraph "🔧 Development Environment"
            WORKSPACE[Demeter Workspace<br/>Cloud-based development]
            TERMINAL[Terminal Access<br/>Direct CLI access]
            FILE_SYSTEM[File System<br/>Project storage]
            EXTENSIONS[VS Code Extensions<br/>Development tools]
        end
        
        subgraph "🌐 Network Access"
            SOCKET_PATH[Node Socket<br/>/opt/cardano/cnode/sockets/node.socket]
            NETWORK_CONFIG[Network Configuration<br/>Preprod/Mainnet switching]
            API_ENDPOINTS[API Endpoints<br/>Direct blockchain access]
        end
    end
    
    subgraph "📦 Project Integration"
        subgraph "🔄 Atomic Swap Projects"
            DEMETER_PROJECT[demeter-atomic-swap/<br/>Cloud-optimized implementation]
            ADA_ETH_PROJECT[ada-eth-atomic-swap/<br/>Standard implementation]
        end
        
        subgraph "🏗️ Smart Contracts"
            HASKELL_CONTRACTS[Cardano-Haskell/<br/>Plutus contracts]
            AIKEN_VALIDATORS[Cardano-Aiken/<br/>High-performance validators]
            ETH_CONTRACTS[Ethereum-1inch/<br/>Solidity with 1inch]
        end
        
        subgraph "⚙️ Configuration"
            DEMETER_CONFIG[demeter.json<br/>Platform-specific config]
            NETWORK_TEMPLATES[Network Templates<br/>Preprod/Mainnet configs]
            SCRIPT_AUTOMATION[Automation Scripts<br/>Deployment & execution]
        end
    end
    
    subgraph "🔗 External Integrations"
        GITHUB_REPO[GitHub Repository<br/>https://github.com/SHLOK333/nuvex-cardano]
        ONEINCH_API[1inch API<br/>Liquidity aggregation]
        ETHEREUM_RPC[Ethereum RPC<br/>Alchemy/Infura endpoints]
    end
    
    %% Demeter infrastructure connections
    DEMETER_NODE --> SOCKET_PATH
    DEMETER_BLOCKFROST --> API_ENDPOINTS
    DEMETER_VSCODE --> WORKSPACE
    DEMETER_AIKEN --> EXTENSIONS
    
    %% Project connections
    WORKSPACE --> DEMETER_PROJECT
    WORKSPACE --> ADA_ETH_PROJECT
    TERMINAL --> SCRIPT_AUTOMATION
    
    %% Contract connections
    DEMETER_AIKEN --> AIKEN_VALIDATORS
    DEMETER_VSCODE --> HASKELL_CONTRACTS
    FILE_SYSTEM --> ETH_CONTRACTS
    
    %% Configuration connections
    NETWORK_CONFIG --> DEMETER_CONFIG
    NETWORK_CONFIG --> NETWORK_TEMPLATES
    
    %% External connections
    GITHUB_REPO --> DEMETER_PROJECT
    ONEINCH_API --> ETH_CONTRACTS
    ETHEREUM_RPC --> ETH_CONTRACTS

    classDef demeterStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px
    classDef infraStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef devStyle fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef networkStyle fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef projectStyle fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    classDef contractStyle fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef configStyle fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef externalStyle fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    
    class DEMETER_NODE,DEMETER_BLOCKFROST,DEMETER_VSCODE,DEMETER_AIKEN infraStyle
    class WORKSPACE,TERMINAL,FILE_SYSTEM,EXTENSIONS devStyle
    class SOCKET_PATH,NETWORK_CONFIG,API_ENDPOINTS networkStyle
    class DEMETER_PROJECT,ADA_ETH_PROJECT projectStyle
    class HASKELL_CONTRACTS,AIKEN_VALIDATORS,ETH_CONTRACTS contractStyle
    class DEMETER_CONFIG,NETWORK_TEMPLATES,SCRIPT_AUTOMATION configStyle
    class GITHUB_REPO,ONEINCH_API,ETHEREUM_RPC externalStyle
```

---

## 🔄 **Complete Bidirectional Flow Architecture**

### **ETH → ADA with 1inch Optimization**

```mermaid
sequenceDiagram
    participant Alice as Alice<br/>(ETH Holder)
    participant EthEscrow as AtomicSwap1inch.sol<br/>(Ethereum)
    participant OneInch as 1inch Router<br/>(Liquidity Aggregation)
    participant Oracle as Cross-Chain Oracle<br/>(Event Bridge)
    participant AdaEscrow as escrow.ak<br/>(Cardano Validator)
    participant Bob as Bob<br/>(ADA Holder)
    participant Demeter as Demeter.run<br/>(Cloud Infrastructure)

    Note over Alice,Demeter: Phase 1: Initialization & Setup
    Alice->>Alice: Generate secret (32 bytes)
    Alice->>Alice: secretHash = keccak256(secret)
    Bob->>Demeter: Setup Cardano environment
    Demeter->>AdaEscrow: Deploy validator on Cardano

    Note over Alice,Demeter: Phase 2: ETH Lock with 1inch Preparation
    Alice->>EthEscrow: createSwap(secretHash, Bob, deadline, ETH, cardanoTxHash, minReturn)
    EthEscrow->>EthEscrow: _validateMevProtection(deadline)
    EthEscrow->>EthEscrow: Lock ETH in contract
    EthEscrow->>Oracle: Emit SwapCreated event
    Oracle->>Demeter: Broadcast ETH lock status

    Note over Alice,Demeter: Phase 3: ADA Lock Response
    Bob->>Demeter: Query ETH lock status via Blockfrost
    Demeter->>Bob: Confirm ETH lock with same secretHash
    Bob->>AdaEscrow: Lock ADA with secretHash + deadline
    AdaEscrow->>AdaEscrow: Create UTXO with datum(secretHash, deadline)
    AdaEscrow->>Oracle: Broadcast ADA lock confirmation

    Note over Alice,Demeter: Phase 4: ADA Claim with Secret Revelation
    Alice->>AdaEscrow: Reveal secret + claim ADA
    AdaEscrow->>AdaEscrow: Validate sha256(secret) == secretHash
    AdaEscrow->>Alice: Transfer ADA to Alice
    AdaEscrow->>Oracle: Broadcast secret revelation
    Oracle->>EthEscrow: Secret now available for ETH claim

    Note over Alice,Demeter: Phase 5: ETH Claim with 1inch Optimization
    Bob->>Oracle: Get revealed secret
    Bob->>OneInch: Query optimal swap routes for ETH
    OneInch->>Bob: Return optimized calldata
    Bob->>EthEscrow: claimWithOneInch(swapId, secret, oneinchCalldata)
    EthEscrow->>EthEscrow: Verify keccak256(secret) == secretHash
    EthEscrow->>OneInch: Execute 1inch swap for optimal rates
    OneInch->>OneInch: Route through multiple DEXs
    OneInch->>EthEscrow: Return optimized amount
    EthEscrow->>Bob: Transfer optimized ETH amount
```

### **ADA → ETH with Reverse Flow**

```mermaid
sequenceDiagram
    participant Bob as Bob<br/>(ADA Holder)
    participant AdaEscrow as reverse_validator.ak<br/>(Cardano)
    participant Demeter as Demeter.run<br/>(Infrastructure)
    participant Oracle as Cross-Chain Bridge<br/>(Event Coordination)
    participant EthEscrow as AtomicSwap1inch.sol<br/>(Ethereum)
    participant OneInch as 1inch Protocol<br/>(Optimization)
    participant Alice as Alice<br/>(ETH Holder)

    Note over Bob,Alice: Phase 1: Reverse Flow Initialization
    Bob->>Bob: Generate secret (32 bytes)
    Bob->>Bob: secretHash = sha256(secret)
    Bob->>Demeter: Access Cardano node via Demeter.run
    Demeter->>AdaEscrow: Prepare reverse validator

    Note over Bob,Alice: Phase 2: ADA Lock First
    Bob->>AdaEscrow: Lock ADA with reverse_validator.ak
    AdaEscrow->>AdaEscrow: Create UTXO with secretHash + deadline
    AdaEscrow->>Demeter: Update via Blockfrost API
    Demeter->>Oracle: Broadcast ADA lock event
    Oracle->>EthEscrow: Notify ADA lock with secretHash

    Note over Bob,Alice: Phase 3: ETH Lock Response
    Alice->>Oracle: Query ADA lock status
    Oracle->>Alice: Confirm ADA lock details
    Alice->>EthEscrow: createSwap(secretHash, Bob, deadline, ETH, adaTxHash, minReturn)
    EthEscrow->>EthEscrow: Apply MEV protection
    EthEscrow->>EthEscrow: Lock ETH funds
    EthEscrow->>Oracle: Confirm ETH lock

    Note over Bob,Alice: Phase 4: ETH Claim with 1inch
    Bob->>OneInch: Query best ETH swap routes
    OneInch->>Bob: Return aggregated calldata
    Bob->>EthEscrow: claimWithOneInch(swapId, secret, calldata)
    EthEscrow->>EthEscrow: Verify keccak256(secret) == secretHash
    EthEscrow->>OneInch: Execute optimal swap
    OneInch->>OneInch: Aggregate across Uniswap, Sushiswap, etc.
    OneInch->>Bob: Transfer optimized ETH
    EthEscrow->>Oracle: Broadcast secret revelation

    Note over Bob,Alice: Phase 5: ADA Claim with Revealed Secret
    Alice->>Oracle: Get revealed secret
    Alice->>Demeter: Access Cardano via Demeter.run
    Alice->>AdaEscrow: Unlock ADA with revealed secret
    AdaEscrow->>AdaEscrow: Validate secret against hash
    AdaEscrow->>Alice: Transfer ADA to Alice
```

---

## 🌐 **Demeter.run Integration Links**

### **Quick Access Links**

- 🏠 **Demeter.run Platform**: [https://demeter.run](https://demeter.run)
- 📚 **Demeter Documentation**: [https://docs.demeter.run](https://docs.demeter.run)
- 🎯 **Project Setup Guide**: [`demeter-atomic-swap/README.md`](./demeter-atomic-swap/README.md)
- ⚙️ **Configuration Templates**: [`demeter-atomic-swap/config/`](./demeter-atomic-swap/config/)

### **Demeter.run Workspace Setup**

```bash
# 1. Create Demeter.run workspace
# Visit: https://demeter.run/new-workspace

# 2. Select Extensions:
# ✅ Cardano Node (Preprod/Mainnet)
# ✅ Blockfrost API 
# ✅ VS Code IDE
# ✅ Aiken Language Server

# 3. Clone project in Demeter workspace
git clone https://github.com/SHLOK333/nuvex-cardano.git
cd nuvex-cardano/demeter-atomic-swap

# 4. Run setup script
./scripts/setup-demeter.sh

# 5. Deploy contracts
./scripts/deploy-contracts.sh preprod
```

---

## 🌲 **Code Branch Architecture & Extension Integration**

### **Project Code Branches Overview**

```mermaid
gitgraph
    commit id: "Initial Setup"
    branch main
    commit id: "Basic Escrow"
    
    branch ada-eth-atomic-swap
    commit id: "Standard Implementation"
    commit id: "Basic HTLCs"
    commit id: "Cross-chain Events"
    
    branch demeter-atomic-swap
    commit id: "Cloud Infrastructure"
    commit id: "1inch Integration" 
    commit id: "MEV Protection"
    commit id: "Advanced Features"
    
    branch cardano-core
    commit id: "Aiken Validators"
    commit id: "Haskell Contracts"
    commit id: "MeshSDK Integration"
    
    branch ethereum-core
    commit id: "Foundry Setup"
    commit id: "Basic Escrow Contract"
    commit id: "Timelock Features"
    commit id: "1inch Router Integration"
    
    checkout main
    merge ada-eth-atomic-swap
    merge demeter-atomic-swap
    merge cardano-core
    merge ethereum-core
    commit id: "Production Ready"
```

### **Extension Integration Architecture**

```mermaid
graph TB
    subgraph "🎯 Core Extension Categories"
        subgraph "🛡️ Security Extensions"
            OZ_REENTRANCY[ReentrancyGuard<br/>Prevents reentrancy attacks]
            OZ_OWNABLE[Ownable<br/>Access control]
            OZ_PAUSABLE[Pausable<br/>Emergency stops]
        end
        
        subgraph "💰 Token Extensions"
            OZ_ERC20[IERC20<br/>Token interface]
            OZ_SAFE_ERC20[SafeERC20<br/>Safe transfers]
            OZ_ERC20_PERMIT[ERC20Permit<br/>Gasless approvals]
        end
        
        subgraph "🌟 DeFi Protocol Extensions"
            ONEINCH_ROUTER[1inch AggregationRouterV5<br/>Optimal liquidity routing]
            ONEINCH_ORDER[1inch OrderMixin<br/>Advanced order types]
            ONEINCH_LIMIT[1inch LimitOrderProtocol<br/>Conditional orders]
        end
        
        subgraph "🏗️ Cardano Extensions"
            AIKEN_STDLIB[Aiken Standard Library<br/>Core validation functions]
            PLUTUS_TX[PlutusTx<br/>Haskell to Plutus compilation]
            MESH_SDK[MeshSDK<br/>Transaction building]
            BLOCKFROST[Blockfrost API<br/>Blockchain queries]
        end
        
        subgraph "☁️ Demeter.run Extensions"
            DEMETER_NODE[Cardano Node<br/>Direct blockchain access]
            DEMETER_BLOCKFROST[Integrated Blockfrost<br/>API access]
            DEMETER_VSCODE[VS Code IDE<br/>Cloud development]
            DEMETER_AIKEN[Aiken Language Server<br/>Smart contract support]
        end
    end
    
    subgraph "🔄 Integration Points"
        subgraph "⛓️ Ethereum Contract Integration"
            ETH_CONTRACT[AtomicSwap1inch.sol]
            ETH_IMPORTS[Import Structure]
            ETH_INHERITANCE[Contract Inheritance]
            ETH_USAGE[Function Usage]
        end
        
        subgraph "🏛️ Cardano Contract Integration"
            ADA_VALIDATOR[escrow.ak / AtomicSwap.hs]
            ADA_IMPORTS[Library Imports]
            ADA_FUNCTIONS[Validation Functions]
            ADA_TYPES[Data Types]
        end
        
        subgraph "🌐 Cross-Chain Integration"
            BRIDGE_EVENTS[Event Coordination]
            BRIDGE_HASH[Hash Synchronization]
            BRIDGE_TIME[Timelock Coordination]
        end
    end
    
    %% Security extension connections
    OZ_REENTRANCY --> ETH_CONTRACT
    OZ_OWNABLE --> ETH_CONTRACT
    OZ_PAUSABLE --> ETH_CONTRACT
    
    %% Token extension connections
    OZ_ERC20 --> ETH_IMPORTS
    OZ_SAFE_ERC20 --> ETH_INHERITANCE
    OZ_ERC20_PERMIT --> ETH_USAGE
    
    %% DeFi protocol connections
    ONEINCH_ROUTER --> ETH_CONTRACT
    ONEINCH_ORDER --> ETH_IMPORTS
    ONEINCH_LIMIT --> ETH_USAGE
    
    %% Cardano extension connections
    AIKEN_STDLIB --> ADA_VALIDATOR
    PLUTUS_TX --> ADA_IMPORTS
    MESH_SDK --> ADA_FUNCTIONS
    BLOCKFROST --> ADA_TYPES
    
    %% Demeter extension connections
    DEMETER_NODE --> ADA_VALIDATOR
    DEMETER_BLOCKFROST --> ADA_FUNCTIONS
    DEMETER_VSCODE --> ADA_VALIDATOR
    DEMETER_AIKEN --> ADA_VALIDATOR
    
    %% Cross-chain connections
    ETH_CONTRACT --> BRIDGE_EVENTS
    ADA_VALIDATOR --> BRIDGE_EVENTS
    ETH_USAGE --> BRIDGE_HASH
    ADA_FUNCTIONS --> BRIDGE_HASH
    ETH_CONTRACT --> BRIDGE_TIME
    ADA_VALIDATOR --> BRIDGE_TIME

    classDef securityStyle fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef tokenStyle fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef defiStyle fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef cardanoStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef demeterStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef ethStyle fill:#e0f7fa,stroke:#006064,stroke-width:3px
    classDef adaStyle fill:#e8eaf6,stroke:#3f51b5,stroke-width:3px
    classDef bridgeStyle fill:#f1f8e9,stroke:#33691e,stroke-width:3px
    
    class OZ_REENTRANCY,OZ_OWNABLE,OZ_PAUSABLE securityStyle
    class OZ_ERC20,OZ_SAFE_ERC20,OZ_ERC20_PERMIT tokenStyle
    class ONEINCH_ROUTER,ONEINCH_ORDER,ONEINCH_LIMIT defiStyle
    class AIKEN_STDLIB,PLUTUS_TX,MESH_SDK,BLOCKFROST cardanoStyle
    class DEMETER_NODE,DEMETER_BLOCKFROST,DEMETER_VSCODE,DEMETER_AIKEN demeterStyle
    class ETH_CONTRACT,ETH_IMPORTS,ETH_INHERITANCE,ETH_USAGE ethStyle
    class ADA_VALIDATOR,ADA_IMPORTS,ADA_FUNCTIONS,ADA_TYPES adaStyle
    class BRIDGE_EVENTS,BRIDGE_HASH,BRIDGE_TIME bridgeStyle
```

### **How Extensions Work Together**

```mermaid
graph LR
    subgraph "🔗 Extension Interaction Flow"
        subgraph "📥 Import Phase"
            IMPORT[Contract Imports<br/>Extensions & Interfaces]
            INHERIT[Contract Inheritance<br/>Multiple extension classes]
            USING[Using Directives<br/>Library functions]
        end
        
        subgraph "🏗️ Initialization Phase"
            CONSTRUCTOR[Constructor<br/>Initialize extensions]
            SETUP[Setup Phase<br/>Configure parameters]
            VALIDATION[Validation<br/>Extension compatibility]
        end
        
        subgraph "⚡ Runtime Phase"
            MODIFIERS[Function Modifiers<br/>Security enforcement]
            CALLS[Extension Calls<br/>Functionality usage]
            EVENTS[Event Emissions<br/>Cross-chain coordination]
        end
        
        subgraph "🔄 Integration Phase"
            COORDINATION[Cross-Chain Coordination<br/>Event synchronization]
            OPTIMIZATION[1inch Optimization<br/>Liquidity routing]
            SECURITY[Security Enforcement<br/>Multi-layer protection]
        end
    end
    
    IMPORT --> INHERIT
    INHERIT --> USING
    USING --> CONSTRUCTOR
    CONSTRUCTOR --> SETUP
    SETUP --> VALIDATION
    VALIDATION --> MODIFIERS
    MODIFIERS --> CALLS
    CALLS --> EVENTS
    EVENTS --> COORDINATION
    COORDINATION --> OPTIMIZATION
    OPTIMIZATION --> SECURITY

    classDef importStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef initStyle fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef runtimeStyle fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef integrationStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class IMPORT,INHERIT,USING importStyle
    class CONSTRUCTOR,SETUP,VALIDATION initStyle
    class MODIFIERS,CALLS,EVENTS runtimeStyle
    class COORDINATION,OPTIMIZATION,SECURITY integrationStyle
```

### **1. Standard Atomic Swap Implementation (`ada-eth-atomic-swap/`)**

#### **ETH → ADA Flow Diagram**

```mermaid
sequenceDiagram
    participant Alice as Alice (ETH Holder)
    participant EthContract as Ethereum Escrow
    participant Oracle as Cross-Chain Oracle
    participant CardanoContract as Cardano Validator
    participant Bob as Bob (ADA Holder)

    Note over Alice,Bob: Phase 1: Initialization
    Alice->>Alice: Generate secret (32 bytes)
    Alice->>Alice: Create hash = keccak256(secret)
    
    Note over Alice,Bob: Phase 2: ETH Lock
    Alice->>EthContract: createSwap(hash, Bob, deadline, amount)
    EthContract->>EthContract: Lock ETH funds
    EthContract->>Oracle: Emit CrossChainEvent
    
    Note over Alice,Bob: Phase 3: ADA Lock
    Bob->>Oracle: Query ETH lock status
    Oracle->>Bob: Return ETH lock confirmation
    Bob->>CardanoContract: Lock ADA with same hash
    CardanoContract->>CardanoContract: Create UTXO with hash
    
    Note over Alice,Bob: Phase 4: Secret Revelation
    Alice->>CardanoContract: Reveal secret + claim ADA
    CardanoContract->>Alice: Transfer ADA
    CardanoContract->>Oracle: Broadcast secret
    
    Note over Alice,Bob: Phase 5: ETH Claim
    Bob->>Oracle: Get revealed secret
    Bob->>EthContract: claimWithSecret(secret)
    EthContract->>EthContract: Verify hash(secret)
    EthContract->>Bob: Transfer ETH
```

#### **ADA → ETH Flow Diagram**

```mermaid
sequenceDiagram
    participant Bob as Bob (ADA Holder)
    participant CardanoContract as Cardano Validator
    participant Oracle as Cross-Chain Oracle
    participant EthContract as Ethereum Escrow
    participant Alice as Alice (ETH Holder)

    Note over Bob,Alice: Phase 1: Initialization
    Bob->>Bob: Generate secret (32 bytes)
    Bob->>Bob: Create hash = sha256(secret)
    
    Note over Bob,Alice: Phase 2: ADA Lock
    Bob->>CardanoContract: Lock ADA with hash
    CardanoContract->>CardanoContract: Create UTXO with hash
    CardanoContract->>Oracle: Emit ADA lock event
    
    Note over Bob,Alice: Phase 3: ETH Lock
    Alice->>Oracle: Query ADA lock status
    Oracle->>Alice: Return ADA lock confirmation
    Alice->>EthContract: createSwap(hash, Bob, deadline, amount)
    EthContract->>EthContract: Lock ETH funds
    
    Note over Bob,Alice: Phase 4: Secret Revelation
    Bob->>EthContract: Reveal secret + claim ETH
    EthContract->>Bob: Transfer ETH
    EthContract->>Oracle: Broadcast secret
    
    Note over Bob,Alice: Phase 5: ADA Claim
    Alice->>Oracle: Get revealed secret
    Alice->>CardanoContract: Unlock ADA with secret
    CardanoContract->>Alice: Transfer ADA
```

---

### **2. 1inch Integration Deep Dive**

#### **AtomicSwap1inch.sol Contract Analysis**

The contract implements advanced features with 1inch protocol integration:

```mermaid
graph TB
    subgraph "🎯 AtomicSwap1inch Contract Structure"
        MAIN_CONTRACT[AtomicSwap1inch.sol<br/>Main Contract]
        
        subgraph "📝 Core Interfaces"
            ROUTER_INTERFACE[IAggregationRouterV5<br/>1inch Router Interface]
            ORDER_INTERFACE[IOrderMixin<br/>Order Management]
        end
        
        subgraph "🏗️ Data Structures"
            SWAP_DATA[AtomicSwapData<br/>Complete swap information]
            MEV_PROTECTION[MevProtection<br/>Anti-MEV parameters]
            ORDER_STRUCT[Order<br/>1inch order structure]
        end
        
        subgraph "⚡ Core Functions"
            CREATE_SWAP[createSwap()<br/>Initialize atomic swap]
            CLAIM_1INCH[claimWithOneInch()<br/>Claim with 1inch execution]
            REFUND[refund()<br/>Timeout refund]
            EXECUTE_SWAP[_executeOneInchSwap()<br/>Internal 1inch integration]
        end
        
        subgraph "🛡️ Security Features"
            REENTRANCY[ReentrancyGuard<br/>Reentrancy protection]
            OWNERSHIP[Ownable<br/>Access control]
            MEV_VALIDATION[_validateMevProtection()<br/>MEV protection]
        end
    end

    MAIN_CONTRACT --> ROUTER_INTERFACE
    MAIN_CONTRACT --> ORDER_INTERFACE
    MAIN_CONTRACT --> SWAP_DATA
    MAIN_CONTRACT --> MEV_PROTECTION
    MAIN_CONTRACT --> ORDER_STRUCT
    
    CREATE_SWAP --> MEV_VALIDATION
    CLAIM_1INCH --> EXECUTE_SWAP
    EXECUTE_SWAP --> ROUTER_INTERFACE
    
    MAIN_CONTRACT --> REENTRANCY
    MAIN_CONTRACT --> OWNERSHIP

    classDef contractStyle fill:#e8f5e8,stroke:#2e7d32,stroke-width:3px
    classDef interfaceStyle fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef dataStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef functionStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef securityStyle fill:#ffebee,stroke:#c62828,stroke-width:2px
    
    class MAIN_CONTRACT contractStyle
    class ROUTER_INTERFACE,ORDER_INTERFACE interfaceStyle
    class SWAP_DATA,MEV_PROTECTION,ORDER_STRUCT dataStyle
    class CREATE_SWAP,CLAIM_1INCH,REFUND,EXECUTE_SWAP functionStyle
    class REENTRANCY,OWNERSHIP,MEV_VALIDATION securityStyle
```

#### **1inch Integration Points**

```solidity
// 1inch Protocol Integration Points in AtomicSwap1inch.sol

// 1. Router Interface Integration
interface IAggregationRouterV5 {
    function swap(
        address executor,
        SwapDescription calldata desc,
        bytes calldata permit,
        bytes calldata data
    ) external payable returns (uint256 returnAmount, uint256 spentAmount);
}

// 2. Advanced Swap Execution
function _executeOneInchSwap(
    AtomicSwapData memory swap,
    bytes calldata oneinchCalldata
) internal returns (uint256 returnAmount, uint256 spentAmount) {
    // Token approval for 1inch router
    if (swap.token != address(0)) {
        IERC20(swap.token).safeApprove(ONEINCH_ROUTER_V5, swap.amount);
    }
    
    // Execute optimal swap through 1inch aggregation
    (bool success, bytes memory result) = ONEINCH_ROUTER_V5.call{
        value: swap.token == address(0) ? swap.amount : 0
    }(oneinchCalldata);
    
    // Verify minimum return and slippage protection
    require(returnAmount >= swap.oneinchMinReturn, "Insufficient return");
}

// 3. MEV Protection Integration
struct MevProtection {
    uint256 maxSlippageBps;     // 0.5% maximum slippage
    uint256 minGasPrice;        // 10 gwei minimum
    uint256 maxGasPrice;        // 100 gwei maximum  
    uint256 deadlineBuffer;     // 5 minutes buffer
}
```

---

### **3. Advanced Features & Extensions**

#### **Partial Filling Implementation**

```mermaid
graph LR
    subgraph "🔄 Partial Fill Process"
        ORDER[Large Order<br/>e.g., 100 ETH → ADA]
        SPLIT[Order Splitting<br/>Multiple smaller swaps]
        FILL1[Fill 1: 25 ETH<br/>Executed immediately]
        FILL2[Fill 2: 30 ETH<br/>Executed later]
        FILL3[Fill 3: 45 ETH<br/>Remaining amount]
        COMPLETE[Order Complete<br/>All fills executed]
    end
    
    ORDER --> SPLIT
    SPLIT --> FILL1
    SPLIT --> FILL2
    SPLIT --> FILL3
    FILL1 --> COMPLETE
    FILL2 --> COMPLETE
    FILL3 --> COMPLETE

    classDef orderStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef fillStyle fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef completeStyle fill:#fff3e0,stroke:#f57c00,stroke-width:3px
    
    class ORDER,SPLIT orderStyle
    class FILL1,FILL2,FILL3 fillStyle
    class COMPLETE completeStyle
```

#### **MEV Protection Mechanisms**

```mermaid
graph TB
    subgraph "🛡️ MEV Protection Architecture"
        TRANSACTION[User Transaction]
        
        subgraph "⚡ Gas Price Controls"
            MIN_GAS[Minimum Gas Price<br/>10 gwei floor]
            MAX_GAS[Maximum Gas Price<br/>100 gwei ceiling]
            PRIORITY[Priority Fee Control<br/>Intelligent fee management]
        end
        
        subgraph "⏰ Timing Protection"
            DEADLINE[Deadline Buffer<br/>5 minute minimum]
            TIMESTAMP[Block Timestamp<br/>Validation]
            WINDOW[Execution Window<br/>Protected timeframe]
        end
        
        subgraph "💧 Slippage Protection"
            MAX_SLIPPAGE[Maximum Slippage<br/>0.5% limit]
            MIN_RETURN[Minimum Return<br/>Guaranteed output]
            ORACLE[Price Oracle<br/>Fair value reference]
        end
        
        PROTECTED[MEV-Protected Execution]
    end
    
    TRANSACTION --> MIN_GAS
    TRANSACTION --> DEADLINE
    TRANSACTION --> MAX_SLIPPAGE
    
    MIN_GAS --> PROTECTED
    MAX_GAS --> PROTECTED
    PRIORITY --> PROTECTED
    
    DEADLINE --> PROTECTED
    TIMESTAMP --> PROTECTED
    WINDOW --> PROTECTED
    
    MAX_SLIPPAGE --> PROTECTED
    MIN_RETURN --> PROTECTED
    ORACLE --> PROTECTED

    classDef transactionStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:3px
    classDef protectionStyle fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef resultStyle fill:#e8f5e8,stroke:#2e7d32,stroke-width:3px
    
    class TRANSACTION transactionStyle
    class MIN_GAS,MAX_GAS,PRIORITY,DEADLINE,TIMESTAMP,WINDOW,MAX_SLIPPAGE,MIN_RETURN,ORACLE protectionStyle
    class PROTECTED resultStyle
```

---

### **4. Smart Contract Escrow System**

#### **Escrow Flow Architecture**

```mermaid
stateDiagram-v2
    [*] --> CREATED: createSwap()
    CREATED --> LOCKED: Funds deposited
    LOCKED --> CLAIMED: secret revealed + claimWithOneInch()
    LOCKED --> REFUNDED: deadline expired + refund()
    LOCKED --> CANCELLED: owner cancellation
    CLAIMED --> [*]: Swap completed
    REFUNDED --> [*]: Funds returned
    CANCELLED --> [*]: Swap cancelled
    
    note right of LOCKED: MEV Protection Active
    note right of CLAIMED: 1inch Execution
    note right of REFUNDED: Timeout Protection
```

#### **Escrow Security Features**

```mermaid
graph TB
    subgraph "🔒 Escrow Security Architecture"
        ESCROW[Smart Contract Escrow]
        
        subgraph "🛡️ Access Controls"
            OWNER[Owner-only functions]
            BENEFICIARY[Beneficiary verification]
            REFUND_AUTH[Refund authorization]
        end
        
        subgraph "⏱️ Time-based Security"
            DEADLINE_CHECK[Deadline validation]
            BUFFER[Minimum buffer time]
            EXPIRY[Automatic expiry]
        end
        
        subgraph "🔐 Cryptographic Security"
            SECRET_HASH[SHA256 secret hashing]
            SIGNATURE[Digital signatures]
            NONCE[Replay protection]
        end
        
        subgraph "💰 Fund Security"
            REENTRANCY[Reentrancy guards]
            SAFE_TRANSFER[SafeERC20 transfers]
            BALANCE_CHECK[Balance verification]
        end
    end
    
    ESCROW --> OWNER
    ESCROW --> BENEFICIARY
    ESCROW --> REFUND_AUTH
    
    ESCROW --> DEADLINE_CHECK
    ESCROW --> BUFFER
    ESCROW --> EXPIRY
    
    ESCROW --> SECRET_HASH
    ESCROW --> SIGNATURE
    ESCROW --> NONCE
    
    ESCROW --> REENTRANCY
    ESCROW --> SAFE_TRANSFER
    ESCROW --> BALANCE_CHECK

    classDef escrowStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:3px
    classDef securityStyle fill:#ffebee,stroke:#c62828,stroke-width:2px
    
    class ESCROW escrowStyle
    class OWNER,BENEFICIARY,REFUND_AUTH,DEADLINE_CHECK,BUFFER,EXPIRY,SECRET_HASH,SIGNATURE,NONCE,REENTRANCY,SAFE_TRANSFER,BALANCE_CHECK securityStyle
```

---

### **5. Extensions & Integrations Used**

#### **OpenZeppelin Extensions**

```mermaid
graph LR
    subgraph "📚 OpenZeppelin Integration"
        CONTRACT[AtomicSwap1inch.sol]
        
        subgraph "🛡️ Security Extensions"
            REENTRANCY[ReentrancyGuard<br/>Prevents reentrancy attacks]
            OWNABLE[Ownable<br/>Access control management]
        end
        
        subgraph "💰 Token Extensions"
            IERC20[IERC20<br/>Token interface standard]
            SAFEERC20[SafeERC20<br/>Safe token transfers]
        end
        
        subgraph "⚡ Utility Extensions"
            ADDRESS[Address<br/>Address utilities]
            CONTEXT[Context<br/>Meta-transaction support]
        end
    end
    
    CONTRACT --> REENTRANCY
    CONTRACT --> OWNABLE
    CONTRACT --> IERC20
    CONTRACT --> SAFEERC20
    CONTRACT --> ADDRESS
    CONTRACT --> CONTEXT

    classDef contractStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:3px
    classDef extensionStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class CONTRACT contractStyle
    class REENTRANCY,OWNABLE,IERC20,SAFEERC20,ADDRESS,CONTEXT extensionStyle
```

#### **1inch Protocol Extensions**

```mermaid
graph TB
    subgraph "🌟 1inch Protocol Integration"
        ONEINCH[1inch Aggregation Protocol]
        
        subgraph "🔧 Router Components"
            ROUTER_V5[AggregationRouterV5<br/>Main swap router]
            ORDER_MIXIN[OrderMixin<br/>Order management]
            LIMIT_ORDER[LimitOrderProtocol<br/>Advanced orders]
        end
        
        subgraph "💡 Smart Features"
            PATHFINDER[Pathfinder<br/>Optimal route discovery]
            CHI_TOKEN[CHI Token<br/>Gas optimization]
            PRICE_ORACLE[Price Oracle<br/>Fair price discovery]
        end
        
        subgraph "🎯 Optimization Features"
            GAS_OPTIMIZATION[Gas Optimization<br/>Minimal gas usage]
            PARTIAL_FILL[Partial Fill<br/>Large order splitting]
            MEV_PROTECTION[MEV Protection<br/>Front-run defense]
        end
    end
    
    ONEINCH --> ROUTER_V5
    ONEINCH --> ORDER_MIXIN
    ONEINCH --> LIMIT_ORDER
    
    ROUTER_V5 --> PATHFINDER
    ROUTER_V5 --> CHI_TOKEN
    ROUTER_V5 --> PRICE_ORACLE
    
    ORDER_MIXIN --> GAS_OPTIMIZATION
    ORDER_MIXIN --> PARTIAL_FILL
    ORDER_MIXIN --> MEV_PROTECTION

    classDef oneinchStyle fill:#fff3e0,stroke:#f57c00,stroke-width:3px
    classDef routerStyle fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef featureStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef optimizationStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    
    class ONEINCH oneinchStyle
    class ROUTER_V5,ORDER_MIXIN,LIMIT_ORDER routerStyle
    class PATHFINDER,CHI_TOKEN,PRICE_ORACLE featureStyle
    class GAS_OPTIMIZATION,PARTIAL_FILL,MEV_PROTECTION optimizationStyle
```

---

## 🔍 **Detailed Contract Analysis**

### **AtomicSwap1inch.sol - Core Functions**

#### **1. createSwap() Function**

```solidity
function createSwap(
    bytes32 secretHash,      // keccak256(secret) - 32 byte hash
    address beneficiary,     // Who can claim with secret
    uint256 deadline,        // Unix timestamp deadline
    address token,           // Token address (0x0 for ETH)
    bytes32 cardanoTxHash,   // Cardano tx for coordination
    uint256 oneinchMinReturn // Minimum 1inch return amount
) external payable nonReentrant
```

**Features:**
- ✅ **Unique Swap ID Generation**: `keccak256(sender + beneficiary + secretHash + deadline + nonce + timestamp)`
- ✅ **MEV Protection Validation**: Gas price limits, deadline buffer validation
- ✅ **Multi-token Support**: ETH and ERC20 tokens
- ✅ **Cross-chain Coordination**: Cardano transaction hash linking

#### **2. claimWithOneInch() Function**

```solidity
function claimWithOneInch(
    bytes32 swapId,              // Unique swap identifier
    bytes32 secret,              // 32-byte secret preimage
    bytes calldata oneinchCalldata // 1inch router calldata
) external nonReentrant
```

**Features:**
- ✅ **Secret Verification**: `keccak256(secret) == storedHash`
- ✅ **Deadline Validation**: Block timestamp checking
- ✅ **Beneficiary Authorization**: Only designated claimer
- ✅ **1inch Integration**: Optimal liquidity routing
- ✅ **Slippage Protection**: Minimum return validation

#### **3. Partial Fill Implementation**

```solidity
// Enhanced structure for partial fills
struct PartialSwapData {
    bytes32 parentSwapId;        // Original large order ID
    uint256 totalAmount;         // Total order amount
    uint256 filledAmount;        // Amount already filled
    uint256 remainingAmount;     // Amount left to fill
    uint256 minFillAmount;       // Minimum fill size
    bool allowPartialFill;       // Enable partial execution
}

// Partial fill execution
function executePartialFill(
    bytes32 swapId,
    uint256 fillAmount,
    bytes calldata oneinchCalldata
) external nonReentrant {
    // Validate fill amount constraints
    // Execute 1inch swap for partial amount
    // Update fill tracking state
    // Emit partial fill events
}
```

---

## 📦 **Project Structure**

```
nuvex-cardano/
├── 📖 README.md                           # This comprehensive guide
├── 🎥 demo-video/                         # Demonstration materials
├── 📊 docs/                               # Additional documentation
│
├── 🔄 ada-eth-atomic-swap/               # Standard atomic swap implementation
│   ├── 📄 README.md                      # Implementation guide
│   ├── 🏗️ cardano/                      # Cardano-side implementation
│   │   ├── reverse_common.js             # Common utilities
│   │   ├── reverse_lock.js               # ADA locking logic
│   │   ├── reverse_unlock.js             # ADA unlocking logic
│   │   └── escrow/                       # Smart contract validators
│   │       ├── reverse_validator.ak      # Aiken validator
│   │       └── reverse_plutus.json       # Compiled Plutus script
│   └── ⛓️ ethereum/                     # Ethereum-side implementation
│       ├── script/                       # Foundry deployment scripts
│       └── src/                          # Smart contracts
│           └── ReverseEscrow.sol         # Ethereum escrow contract
│
├── ☁️ demeter-atomic-swap/              # Demeter.run cloud infrastructure
│   ├── 📊 README.md                     # Detailed architecture guide
│   ├── 🏗️ cardano-haskell/             # Plutus smart contracts
│   │   ├── AtomicSwap.hs                # Main Haskell contract
│   │   └── OneInchIntegration.hs        # 1inch coordination
│   ├── ⚡ cardano-aiken/                # High-performance validators
│   │   └── validators/atomic_swap.ak    # Optimized Aiken validator
│   ├── ⛓️ ethereum-1inch/              # Advanced Ethereum integration
│   │   ├── src/AtomicSwap1inch.sol      # Main contract with 1inch
│   │   └── foundry.toml                 # Foundry configuration
│   ├── ⚙️ config/                       # Network configurations
│   │   ├── preprod.template.json        # Preprod network template
│   │   └── mainnet.template.json        # Mainnet network template
│   └── 🤖 scripts/                      # Automation scripts
│       ├── setup-demeter.sh             # Environment setup
│       ├── deploy-contracts.sh          # Contract deployment
│       └── run-atomic-swap.sh           # Swap execution
│
├── 🔗 cardano/                          # Core Cardano integration
│   ├── 🔑 beneficiary.addr              # Test addresses
│   ├── 🔑 owner.addr                    # Owner addresses
│   ├── 📜 common.js                     # Shared utilities
│   ├── 🔒 lock.js                       # Locking mechanisms
│   ├── 🔓 unlock.js                     # Unlocking mechanisms
│   ├── 🏗️ generate-credentials.js       # Key generation
│   ├── 📦 package.json                  # Node.js dependencies
│   └── 🏛️ escrow/                      # Cardano smart contracts
│       ├── aiken.toml                   # Aiken configuration
│       ├── plutus.json                  # Compiled Plutus scripts
│       └── validators/escrow.ak         # Main escrow validator
│
├── ⛓️ ethereum/                         # Core Ethereum integration
│   ├── 🔧 foundry.toml                  # Foundry configuration
│   ├── 📊 broadcast/                    # Deployment logs
│   ├── 💾 cache/                        # Compilation cache
│   ├── 📚 lib/forge-std/                # Foundry standard library
│   ├── 📜 script/                       # Deployment scripts
│   │   ├── Deploy.sol                   # Standard deployment
│   │   ├── Withdraw.sol                 # Withdrawal script
│   │   ├── TimelockDeploy.sol          # Timelock deployment
│   │   └── TimelockWithdraw.sol        # Timelock withdrawal
│   └── 🏗️ src/                         # Smart contracts
│       └── EscrowSrc.sol                # Core escrow contract
│
└── 🔐 secrets/                          # Security configurations
    ├── blockfrost-api-key.age           # Encrypted API keys
    ├── ethereum-wallet-private-key.age  # Encrypted private keys
    └── secrets.nix                      # Nix secrets configuration
```

---

## 🚀 **Getting Started**

### **Quick Start Guide**

1. **Choose Your Implementation:**
   - 🔄 `ada-eth-atomic-swap/` - Standard implementation
   - ☁️ `demeter-atomic-swap/` - Cloud infrastructure

2. **Set Up Environment:**
   ```bash
   # Clone repository
   git clone https://github.com/SHLOK333/nuvex-cardano.git
   cd nuvex-cardano
   
   # Choose implementation
   cd demeter-atomic-swap  # or ada-eth-atomic-swap
   
   # Install dependencies
   ./scripts/setup-demeter.sh
   ```

3. **Configure Networks:**
   ```bash
   # Copy template configurations
   cp config/preprod.template.json config/preprod.json
   cp config/mainnet.template.json config/mainnet.json
   
   # Add your API keys and configuration
   nano config/preprod.json
   ```

4. **Deploy Contracts:**
   ```bash
   # Deploy to testnet
   ./scripts/deploy-contracts.sh preprod
   
   # Deploy to mainnet (when ready)
   ./scripts/deploy-contracts.sh mainnet
   ```

5. **Execute Atomic Swap:**
   ```bash
   # Run bidirectional swap
   ./scripts/run-atomic-swap.sh preprod
   ```

---

## 🔗 **Live Deployments**

### **Testnet Deployments (Sepolia)**

| Contract | Address | Transaction Hash |
|----------|---------|------------------|
| **EscrowSrc** | `0x7221d00404Ac3EdcD38BcfAEd261b41b676721C9` | [0x693c3ef7bc1b6f0e1ba4648460f42d032d383984d72fc8c646b644087b6dc066](https://sepolia.etherscan.io/tx/0x693c3ef7bc1b6f0e1ba4648460f42d032d383984d72fc8c646b644087b6dc066) |
| **AtomicSwap1inch** | `0x35f0289a16f9427A8f2EDdFf3151Dc088873129c` | [0x06652668660c9059a4a33f188459bf1cfcfa874a784f3270b9dbb918bb0dff65](https://sepolia.etherscan.io/tx/0x06652668660c9059a4a33f188459bf1cfcfa874a784f3270b9dbb918bb0dff65) |
| **Latest Deploy** | `0x0C47546DC870782DDD8A86E0FEb12995523E380d` | [0xb1be12ddee19b3b0c6c6d2fa556a454e9441c945bcaca4ee2252147a34f0983f](https://sepolia.etherscan.io/tx/0xb1be12ddee19b3b0c6c6d2fa556a454e9441c945bcaca4ee2252147a34f0983f) |

### **Cardano Testnet (Preprod)**

| Component | Address/Hash | Explorer Link |
|-----------|--------------|---------------|
| **Test Wallet** | `addr_test1vqp9zy2cct39sh2w6zy4ylyns7jgfkcev7mrtwtfxzg8qgshda3cx` | [Preprod Explorer](https://preprod.cardanoscan.io/address/addr_test1vqp9zy2cct39sh2w6zy4ylyns7jgfkcev7mrtwtfxzg8qgshda3cx) |
| **Generated Wallet** | `addr_test1qrpf2jzqg6wx6rehasphfkfagw0aeqze3km9pzn66kpgv4pwchump6eh3ymzhekjzcsr8khy0faha7m2uhq94wuepkfsu428xe` | [Preprod Explorer](https://preprod.cardanoscan.io/address/addr_test1qrpf2jzqg6wx6rehasphfkfagw0aeqze3km9pzn66kpgv4pwchump6eh3ymzhekjzcsr8khy0faha7m2uhq94wuepkfsu428xe) |
| **Test Transaction** | `2e6ca7b8c9b2184937a52a44f1959a29bf9d0ca75460cb0f5f987d9f6ad50afd` | [Transaction Details](https://preprod.cardanoscan.io/transaction/2e6ca7b8c9b2184937a52a44f1959a29bf9d0ca75460cb0f5f987d9f6ad50afd) |
| **Latest Lock TX** | `f833839c9692d0bff756311b09bed5dc76f06b5da808df91b2755220e4dcd1fc` | [Transaction Details](https://preprod.cardanoscan.io/transaction/f833839c9692d0bff756311b09bed5dc76f06b5da808df91b2755220e4dcd1fc) |

---

## 🎯 **Key Features Summary**

### **✅ Implemented Features**

- 🔄 **Bidirectional Atomic Swaps** (ETH ↔ ADA)
- 🌟 **1inch Protocol Integration** for optimal liquidity
- 🛡️ **MEV Protection** with gas price controls and slippage limits
- ⚡ **Partial Filling** for large orders
- 🔒 **Advanced Escrow System** with multiple security layers
- ☁️ **Demeter.run Integration** for cloud infrastructure
- 🏗️ **Multi-language Support** (Haskell, Aiken, Solidity)
- 🔐 **Comprehensive Security** with OpenZeppelin extensions
- 📊 **Real-time Monitoring** and event tracking
- 🎯 **Production Ready** with testnet deployments

### **🚀 Advanced Capabilities**

- 💧 **Liquidity Aggregation** through 1inch protocol
- 🎯 **Optimal Price Discovery** with multiple DEX sources
- ⚡ **Gas Optimization** with CHI token integration
- 🛡️ **Front-running Protection** via MEV safeguards
- 🔄 **Automatic Retry Logic** for failed transactions
- 📈 **Dynamic Fee Adjustment** based on network conditions
- 🎪 **Cross-chain Event Coordination** with oracles
- 🔍 **Transaction Monitoring** and status tracking

---

## 📞 **Support & Documentation**

- 📖 **Main Documentation**: This README
- ☁️ **Demeter.run Guide**: `demeter-atomic-swap/README.md`
- 🔄 **Standard Implementation**: `ada-eth-atomic-swap/README.md`
- 🎥 **Video Tutorial**: [Demo Video](https://github.com/user-attachments/assets/6d791ecd-8aec-4750-8e8c-4aaef0f49bac)
- 🐛 **Issues**: [GitHub Issues](https://github.com/SHLOK333/nuvex-cardano/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/SHLOK333/nuvex-cardano/discussions)

---

## 📜 **License**

MIT License - See LICENSE file for details.

---

**🌟 Built with ❤️ for the decentralized future of cross-chain finance**

Chain 11155111

Estimated gas price: 0.00180568 gwei

Estimated total gas used for script: 506038

Estimated amount required: 0.00000091374269584 ETH

==========================

##### sepolia
✅  [Success] Hash: 0x693c3ef7bc1b6f0e1ba4648460f42d032d383984d72fc8c646b644087b6dc066
Contract Address: 0x7221d00404Ac3EdcD38BcfAEd261b41b676721C9
Block: 8848709
Paid: 0.0000005435081676 ETH (389260 gas * 0.00139626 gwei)

✅ Sequence #1 on sepolia | Total Paid: 0.0000005435081676 ETH (389260 gas * avg 0.00139626 gwei)


==========================

ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.


Script ran successfully.

== Logs ==
  Contract deployed to: 0x35f0289a16f9427A8f2EDdFf3151Dc088873129c

## Setting up 1 EVM.

==========================

Chain 11155111

Estimated gas price: 0.001210458 gwei

Estimated total gas used for script: 506038

Estimated amount required: 0.000000612537745404 ETH

==========================

##### sepolia
✅  [Success] Hash: 0x06652668660c9059a4a33f188459bf1cfcfa874a784f3270b9dbb918bb0dff65
Contract Address: 0x35f0289a16f9427A8f2EDdFf3151Dc088873129c
Block: 8848753
Paid: 0.00000043189837262 ETH (389260 gas * 0.001109537 gwei)

✅ Sequence #1 on sepolia | Total Paid: 0.00000043189837262 ETH (389260 gas * avg 0.001109537 gwei)


==========================

ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.

https://sepolia.etherscan.io/tx/0xb1be12ddee19b3b0c6c6d2fa556a454e9441c945bcaca4ee2252147a34f0983f





✅ Contract Address: 0x0C47546DC870782DDD8A86E0FEb12995523E380d
new one 
