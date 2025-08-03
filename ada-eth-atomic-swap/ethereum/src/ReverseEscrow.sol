// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

/// @title ReverseEscrow - ETH-side HTLC for atomic swaps (e.g., ADA→ETH)
/// @notice Implements a reverse escrow model as used by 1inch in cross-chain swaps.
/// Funds can be withdrawn using the preimage of a hash before a deadline, or refunded afterward.
/// This contract is typically used on the destination chain (ETH) in 1inch's Fusion+ model.

contract ReverseEscrow {
    // The resolver or initiator who locks funds into the escrow
    address public owner;

    // The recipient (e.g., maker or user expecting ETH on destination chain)
    address public recipient;

    // Hashlock: keccak256(secret), used to verify claim legitimacy
    bytes32 public hashlock;

    // Timelock: Unix timestamp by which the claim must be made
    uint256 public timelock;

    // Flags to prevent double-spending or repeated operations
    bool public withdrawn;
    bool public refunded;

    // Emitted when funds are successfully withdrawn using the correct secret
    event Withdraw(address to, bytes32 secret);

    // Emitted when funds are refunded to the original sender after expiry
    event Refund(address to);

    /// @notice Initializes the reverse escrow
    /// @param _hashlock The keccak256 hash of the secret, shared with the source chain
    /// @param _timelock Unix timestamp deadline for withdrawal
    /// @param _recipient The address eligible to claim the funds using the secret
    /// @dev Mirrors the destination-chain escrow setup used in 1inch Fusion+
    constructor(bytes32 _hashlock, uint256 _timelock, address _recipient) payable {
        owner = msg.sender;           // Resolver or swap executor
        recipient = _recipient;       // Intended receiver of ETH
        hashlock = _hashlock;         // Common across both escrows
        timelock = _timelock;         // Deadline for withdrawal
        withdrawn = false;
        refunded = false;
    }

    /// @notice Withdraws ETH if the correct secret is provided before the deadline
    /// @param _secret The preimage of the hashlock
    /// @dev This function allows the recipient to claim the funds if the correct secret is revealed,
    /// typically after the source-chain escrow has been claimed. This ensures atomicity.
    function withdraw(bytes32 _secret) external {
        require(!withdrawn, "Already withdrawn");
        require(!refunded, "Already refunded");
        require(keccak256(abi.encodePacked(_secret)) == hashlock, "Invalid secret");
        require(block.timestamp < timelock, "Timelock expired");

        withdrawn = true;
        payable(recipient).transfer(address(this).balance);

        emit Withdraw(recipient, _secret);
    }

    /// @notice Refunds the ETH to the original sender after the deadline
    /// @dev If the recipient fails to provide the correct secret before the timelock,
    /// the resolver can recover the funds. This matches the fallback mechanism used in 1inch escrows.
    function refund() external {
        require(!withdrawn, "Already withdrawn");
        require(!refunded, "Already refunded");
        require(block.timestamp >= timelock, "Timelock not yet expired");
        require(msg.sender == owner, "Only owner can refund");

        refunded = true;
        payable(owner).transfer(address(this).balance);

        emit Refund(owner);
    }
}
