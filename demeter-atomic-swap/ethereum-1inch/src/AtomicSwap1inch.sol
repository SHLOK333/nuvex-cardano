// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Atomic Swap with 1inch Integration for Demeter.run
/// @notice Enables atomic swaps between Cardano and Ethereum using 1inch protocol
/// @dev Designed to work with Demeter.run infrastructure and Cardano node
contract AtomicSwap1inch is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // 1inch Protocol interfaces
    interface IAggregationRouterV5 {
        function swap(
            address executor,
            SwapDescription calldata desc,
            bytes calldata permit,
            bytes calldata data
        ) external payable returns (uint256 returnAmount, uint256 spentAmount);
    }

    interface IOrderMixin {
        function hashOrder(Order calldata order) external view returns (bytes32);
    }

    // 1inch Order structure
    struct Order {
        uint256 salt;
        address makerAsset;
        address takerAsset;
        address maker;
        address receiver;
        address allowedSender;
        uint256 makingAmount;
        uint256 takingAmount;
        uint256 offsets;
        bytes interactions;
    }

    struct SwapDescription {
        IERC20 srcToken;
        IERC20 dstToken;
        address payable srcReceiver;
        address payable dstReceiver;
        uint256 amount;
        uint256 minReturnAmount;
        uint256 flags;
    }

    // Atomic swap data structure
    struct AtomicSwapData {
        bytes32 secretHash;         // Hash of the secret (keccak256)
        address beneficiary;        // Who can claim with secret
        address refundTo;           // Who gets refund after deadline
        uint256 deadline;           // Claim deadline (Unix timestamp)
        uint256 amount;             // Amount locked (in wei for ETH)
        address token;              // Token address (address(0) for ETH)
        bytes32 cardanoTxHash;      // Cardano transaction hash for coordination
        uint256 oneinchMinReturn;   // Minimum return from 1inch swap
        bool claimed;               // Whether funds have been claimed
        bool refunded;              // Whether funds have been refunded
        SwapStatus status;          // Current swap status
    }

    enum SwapStatus {
        CREATED,        // Swap created but not locked
        LOCKED,         // Funds locked in contract
        CLAIMED,        // Funds claimed with secret
        REFUNDED,       // Funds refunded after deadline
        CANCELLED       // Swap cancelled
    }

    // 1inch Protocol addresses (Ethereum Mainnet)
    address public constant ONEINCH_ROUTER_V5 = 0x111111125421cA6dc452d289314280a0f8842A65;
    address public constant ONEINCH_ORDER_MIXIN = 0x111111125421cA6dc452d289314280a0f8842A65;

    // MEV Protection parameters
    struct MevProtection {
        uint256 maxSlippageBps;     // Maximum slippage in basis points
        uint256 minGasPrice;        // Minimum gas price (wei)
        uint256 maxGasPrice;        // Maximum gas price (wei)  
        uint256 deadlineBuffer;     // Buffer time before deadline (seconds)
    }

    // State variables
    mapping(bytes32 => AtomicSwapData) public swaps;
    mapping(address => uint256) public nonces;
    MevProtection public mevConfig;
    
    // Events
    event SwapCreated(
        bytes32 indexed swapId,
        address indexed beneficiary,
        address indexed refundTo,
        uint256 amount,
        uint256 deadline
    );
    
    event SwapClaimed(
        bytes32 indexed swapId,
        address indexed claimer,
        bytes32 secret
    );
    
    event SwapRefunded(
        bytes32 indexed swapId,
        address indexed refundee,
        uint256 amount
    );

    event OneInchSwapExecuted(
        bytes32 indexed swapId,
        uint256 returnAmount,
        uint256 spentAmount
    );

    // Custom errors
    error SwapNotFound(bytes32 swapId);
    error SwapAlreadyExists(bytes32 swapId);
    error InvalidSecret(bytes32 providedHash, bytes32 expectedHash);
    error DeadlineExpired(uint256 deadline, uint256 currentTime);
    error DeadlineNotReached(uint256 deadline, uint256 currentTime);
    error UnauthorizedCaller(address caller, address expected);
    error InsufficientBalance(uint256 required, uint256 available);
    error SwapAlreadyProcessed(bytes32 swapId);
    error MevProtectionViolation(string reason);

    constructor() {
        // Initialize MEV protection with reasonable defaults
        mevConfig = MevProtection({
            maxSlippageBps: 50,      // 0.5% max slippage
            minGasPrice: 10 gwei,    // 10 gwei minimum
            maxGasPrice: 100 gwei,   // 100 gwei maximum
            deadlineBuffer: 300      // 5 minutes buffer
        });
    }

    /// @notice Create an atomic swap with 1inch integration
    /// @param secretHash Hash of the secret (keccak256)
    /// @param beneficiary Address that can claim with the secret
    /// @param deadline Unix timestamp deadline for claiming
    /// @param token Token address (address(0) for ETH)
    /// @param cardanoTxHash Cardano transaction hash for coordination
    /// @param oneinchMinReturn Minimum return amount from 1inch swap
    function createSwap(
        bytes32 secretHash,
        address beneficiary,
        uint256 deadline,
        address token,
        bytes32 cardanoTxHash,
        uint256 oneinchMinReturn
    ) external payable nonReentrant {
        // Generate unique swap ID
        bytes32 swapId = keccak256(abi.encodePacked(
            msg.sender,
            beneficiary,
            secretHash,
            deadline,
            nonces[msg.sender]++,
            block.timestamp
        ));

        if (swaps[swapId].deadline != 0) {
            revert SwapAlreadyExists(swapId);
        }

        uint256 amount;
        if (token == address(0)) {
            // ETH swap
            amount = msg.value;
            if (amount == 0) {
                revert InsufficientBalance(1, 0);
            }
        } else {
            // ERC20 token swap
            amount = msg.value; // Amount specified in msg.value for simplicity
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }

        // Apply MEV protection
        _validateMevProtection(deadline);

        // Create swap data
        swaps[swapId] = AtomicSwapData({
            secretHash: secretHash,
            beneficiary: beneficiary,
            refundTo: msg.sender,
            deadline: deadline,
            amount: amount,
            token: token,
            cardanoTxHash: cardanoTxHash,
            oneinchMinReturn: oneinchMinReturn,
            claimed: false,
            refunded: false,
            status: SwapStatus.LOCKED
        });

        emit SwapCreated(swapId, beneficiary, msg.sender, amount, deadline);
    }

    /// @notice Claim funds by revealing the secret and execute 1inch swap
    /// @param swapId The swap identifier
    /// @param secret The secret preimage
    /// @param oneinchCalldata Calldata for 1inch aggregation router
    function claimWithOneInch(
        bytes32 swapId,
        bytes32 secret,
        bytes calldata oneinchCalldata
    ) external nonReentrant {
        AtomicSwapData storage swap = swaps[swapId];
        
        if (swap.deadline == 0) {
            revert SwapNotFound(swapId);
        }

        if (swap.claimed || swap.refunded) {
            revert SwapAlreadyProcessed(swapId);
        }

        // Verify secret
        if (keccak256(abi.encodePacked(secret)) != swap.secretHash) {
            revert InvalidSecret(keccak256(abi.encodePacked(secret)), swap.secretHash);
        }

        // Check deadline
        if (block.timestamp >= swap.deadline) {
            revert DeadlineExpired(swap.deadline, block.timestamp);
        }

        // Verify caller is beneficiary
        if (msg.sender != swap.beneficiary) {
            revert UnauthorizedCaller(msg.sender, swap.beneficiary);
        }

        // Mark as claimed
        swap.claimed = true;
        swap.status = SwapStatus.CLAIMED;

        // Execute 1inch swap if calldata provided
        uint256 returnAmount = swap.amount;
        uint256 spentAmount = swap.amount;

        if (oneinchCalldata.length > 0) {
            (returnAmount, spentAmount) = _executeOneInchSwap(swap, oneinchCalldata);
        }

        // Transfer funds to beneficiary
        if (swap.token == address(0)) {
            // ETH transfer
            payable(swap.beneficiary).transfer(returnAmount);
        } else {
            // ERC20 transfer
            IERC20(swap.token).safeTransfer(swap.beneficiary, returnAmount);
        }

        emit SwapClaimed(swapId, msg.sender, secret);
        emit OneInchSwapExecuted(swapId, returnAmount, spentAmount);
    }

    /// @notice Refund funds after deadline expiry
    /// @param swapId The swap identifier
    function refund(bytes32 swapId) external nonReentrant {
        AtomicSwapData storage swap = swaps[swapId];
        
        if (swap.deadline == 0) {
            revert SwapNotFound(swapId);
        }

        if (swap.claimed || swap.refunded) {
            revert SwapAlreadyProcessed(swapId);
        }

        // Check deadline has passed
        if (block.timestamp < swap.deadline) {
            revert DeadlineNotReached(swap.deadline, block.timestamp);
        }

        // Verify caller is authorized to refund
        if (msg.sender != swap.refundTo) {
            revert UnauthorizedCaller(msg.sender, swap.refundTo);
        }

        // Mark as refunded
        swap.refunded = true;
        swap.status = SwapStatus.REFUNDED;

        // Transfer funds back to refund address
        if (swap.token == address(0)) {
            // ETH refund
            payable(swap.refundTo).transfer(swap.amount);
        } else {
            // ERC20 refund
            IERC20(swap.token).safeTransfer(swap.refundTo, swap.amount);
        }

        emit SwapRefunded(swapId, swap.refundTo, swap.amount);
    }

    /// @notice Execute 1inch swap
    /// @param swap The swap data
    /// @param oneinchCalldata Calldata for 1inch router
    function _executeOneInchSwap(
        AtomicSwapData memory swap,
        bytes calldata oneinchCalldata
    ) internal returns (uint256 returnAmount, uint256 spentAmount) {
        // Approve 1inch router to spend tokens
        if (swap.token != address(0)) {
            IERC20(swap.token).safeApprove(ONEINCH_ROUTER_V5, swap.amount);
        }

        // Execute 1inch swap
        uint256 balanceBefore = _getBalance(swap.token);
        
        (bool success, bytes memory result) = ONEINCH_ROUTER_V5.call{
            value: swap.token == address(0) ? swap.amount : 0
        }(oneinchCalldata);

        require(success, "1inch swap failed");

        uint256 balanceAfter = _getBalance(swap.token);
        
        // Calculate actual return
        if (swap.token == address(0)) {
            returnAmount = balanceAfter > balanceBefore ? balanceAfter - balanceBefore : 0;
            spentAmount = swap.amount;
        } else {
            returnAmount = balanceAfter > balanceBefore ? balanceAfter - balanceBefore : 0;
            spentAmount = swap.amount;
        }

        // Verify minimum return
        require(returnAmount >= swap.oneinchMinReturn, "Insufficient return from 1inch");

        return (returnAmount, spentAmount);
    }

    /// @notice Get balance of token or ETH
    function _getBalance(address token) internal view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        } else {
            return IERC20(token).balanceOf(address(this));
        }
    }

    /// @notice Validate MEV protection parameters
    function _validateMevProtection(uint256 deadline) internal view {
        // Check gas price limits
        if (tx.gasprice < mevConfig.minGasPrice) {
            revert MevProtectionViolation("Gas price too low");
        }
        if (tx.gasprice > mevConfig.maxGasPrice) {
            revert MevProtectionViolation("Gas price too high");
        }

        // Check deadline buffer
        if (deadline <= block.timestamp + mevConfig.deadlineBuffer) {
            revert MevProtectionViolation("Deadline too close");
        }
    }

    /// @notice Update MEV protection configuration (owner only)
    function updateMevConfig(MevProtection calldata newConfig) external onlyOwner {
        mevConfig = newConfig;
    }

    /// @notice Get swap details
    function getSwap(bytes32 swapId) external view returns (AtomicSwapData memory) {
        return swaps[swapId];
    }

    /// @notice Emergency withdrawal (owner only, for stuck funds)
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
    }

    /// @notice Calculate swap ID for off-chain coordination
    function calculateSwapId(
        address creator,
        address beneficiary,
        bytes32 secretHash,
        uint256 deadline,
        uint256 nonce
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            creator,
            beneficiary,
            secretHash,
            deadline,
            nonce,
            block.timestamp
        ));
    }

    receive() external payable {}
}
