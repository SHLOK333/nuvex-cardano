// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {EscrowSrc} from "../src/EscrowSrc.sol";

contract DeployEscrow is Script {
    EscrowSrc public escrow;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        bytes32 hash = 0x290DECD9548B62A8D60345A988386FC84BA6BC95484008F6362F93160EF3E563; // = hash(0)
        uint256 locked_until = block.number + 10000; // Extended to ~33 hours
        address recipient = msg.sender;

        escrow = new EscrowSrc{value: 1000000000000000}(hash, locked_until, recipient); // 0.001 ETH

        console.log("Contract deployed to:", address(escrow));
        console.log("Locked until block:", locked_until);
        console.log("Current block:", block.number);

        vm.stopBroadcast();
    }
}
