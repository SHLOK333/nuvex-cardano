// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import {ReverseEscrow} from "../src/ReverseEscrow.sol";

contract ReverseDeploy is Script {
    function run() external {
        vm.startBroadcast();
        // Example parameters (replace as needed)
        bytes32 hash = 0x290DECD9548B62A8D60345A988386FC84BA6BC95484008F6362F93160EF3E563;
        uint256 timelock = block.timestamp + 1 days;
        address recipient = msg.sender;
        ReverseEscrow escrow = new ReverseEscrow{value: 0.001 ether}(hash, timelock, recipient);
        console.log("ReverseEscrow deployed at:", address(escrow));
        vm.stopBroadcast();
    }
} 