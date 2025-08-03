// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ETH_HTLC {
    address payable public sender;
    address payable public receiver;
    bytes32 public hashlock;
    uint256 public timelock;
    bool public withdrawn;
    bool public refunded;
    bytes32 public preimage;

    constructor(
        address payable _receiver,
        bytes32 _hashlock,
        uint256 _timelock
    ) payable {
        sender = payable(msg.sender);
        receiver = _receiver;
        hashlock = _hashlock;
        timelock = _timelock;
    }

    function withdraw(bytes32 _preimage) external {
        require(msg.sender == receiver, "Not receiver");
        require(!withdrawn, "Already withdrawn");
        require(keccak256(abi.encodePacked(_preimage)) == hashlock, "Invalid preimage");
        require(block.timestamp < timelock, "Time lock expired");

        withdrawn = true;
        preimage = _preimage;
        receiver.transfer(address(this).balance);
    }

    function refund() external {
        require(msg.sender == sender, "Not sender");
        require(!withdrawn, "Already withdrawn");
        require(block.timestamp >= timelock, "Timelock not yet passed");
        require(!refunded, "Already refunded");

        refunded = true;
        sender.transfer(address(this).balance);
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
