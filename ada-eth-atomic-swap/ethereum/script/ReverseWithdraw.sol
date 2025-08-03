// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import {ReverseEscrow} from "../src/ReverseEscrow.sol";

contract ReverseWithdraw is Script {
    function run() external {
        // Set the deployed contract address here
        address escrowAddress = 0x0000000000000000000000000000000000000000;
        ReverseEscrow escrow = ReverseEscrow(escrowAddress);
        bytes32 secret = bytes32(0); // Replace with actual secret
        vm.startBroadcast();
        escrow.withdraw(secret);
        vm.stopBroadcast();
        console.log("Withdraw called with secret:");
        console.logBytes32(secret);
    }
} 