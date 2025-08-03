// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

contract EscrowSrc {
    uint256 locked_amount;
    uint256 locked_until;
    address recipient;
    address original_sender;
    bytes32 hash;

    constructor(bytes32 _hash, uint256 _locked_until, address _recipient) payable {
        locked_amount = msg.value;
        locked_until = _locked_until;
        recipient = _recipient;
        hash = _hash;
        original_sender = msg.sender;
    }

    modifier notExpired() {
        require(block.number <= locked_until, "Expired");
        _;
    }

    modifier expired() {
        require(block.number > locked_until, "Not Expired");
        _;
    }

    // this function is copied from 1inch/cross-chain-swap
    function _keccakBytes32(bytes32 secret) private pure returns (bytes32 ret) {
        assembly ("memory-safe") {
            mstore(0, secret)
            ret := keccak256(0, 0x20)
        }
    }

    function withdraw(bytes32 secret) external notExpired {
        require(_keccakBytes32(secret) == hash, "Hash invalid");
        payable(recipient).transfer(address(this).balance);
    }

    function abort() external expired {
        payable(original_sender).transfer(address(this).balance);
    }
}
