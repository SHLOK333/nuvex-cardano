// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/EscrowSrc.sol";

contract WithdrawScript is Script {
    function run() external {
        address escrowAddress = 0x7944Bb529B83c3B3b4CcF9965aADE1C89A80bc72; // Updated to new contract
        EscrowSrc escrow = EscrowSrc(escrowAddress);

        bytes32 secret = bytes32(0);

        vm.startBroadcast();

        escrow.withdraw(secret);

        vm.stopBroadcast();

        // These functions are provided by the Script contract
        console.log("Withdraw called with secret:");
        console.logBytes32(secret);
    }
}
