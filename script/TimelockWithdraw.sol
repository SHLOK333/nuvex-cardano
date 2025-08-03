// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {EscrowSrc} from "../src/EscrowSrc.sol";

contract TimelockWithdraw is Script {
    function setUp() public {}

    function run() public {
        // Get private key as string first, then convert to uint256 with proper hex prefix
        string memory privateKeyStr = vm.envString("ETH_PRIVATE_KEY");
        uint256 withdrawerPrivateKey = vm.parseUint(string(abi.encodePacked("0x", privateKeyStr)));
        address contractAddress = vm.envAddress("CONTRACT_ADDRESS");
        
        // The secret from our Cardano timelock - convert from hex string to bytes32
        string memory secretStr = vm.envString("SECRET");
        bytes32 secret = bytes32(vm.parseBytes(secretStr));
        
        vm.startBroadcast(withdrawerPrivateKey);

        console.log("ETHEREUM TIMELOCK WITHDRAWAL");
        console.log("============================");
        console.log("Contract Address:", contractAddress);
        console.log("Secret:", vm.toString(secret));
        console.log("");

        EscrowSrc escrow = EscrowSrc(payable(contractAddress));
        
        // Check if timelock has expired
        console.log("Checking timelock status...");
        
        try escrow.withdraw(secret) {
            console.log("WITHDRAWAL SUCCESSFUL!");
            console.log("   Secret was valid and timelock not expired");
            console.log("   Funds transferred to recipient");
        } catch Error(string memory reason) {
            console.log("Withdrawal failed:", reason);
            
            if (keccak256(bytes(reason)) == keccak256(bytes("Expired"))) {
                console.log("Timelock has expired!");
                console.log("   Use abort() function for refund instead");
            } else if (keccak256(bytes(reason)) == keccak256(bytes("Hash invalid"))) {
                console.log("Invalid secret provided!");
                console.log("   Check the secret hash matches");
            }
        }

        vm.stopBroadcast();

        console.log("");
        console.log("Block Explorer:");
        console.log("   https://sepolia.etherscan.io/address/", contractAddress);
    }
}
