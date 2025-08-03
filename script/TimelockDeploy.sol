// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {EscrowSrc} from "../src/EscrowSrc.sol";

contract TimelockDeploy is Script {
    function setUp() public {}

    function run() public {
        // Get private key as string first, then convert to uint256 with proper hex prefix
        string memory privateKeyStr = vm.envString("ETH_PRIVATE_KEY");
        uint256 deployerPrivateKey = vm.parseUint(string(abi.encodePacked("0x", privateKeyStr)));
        address recipient = vm.envAddress("RECIPIENT_ADDRESS");
        
        // Get ETH amount from env (default 0.001 ETH if not set)
        uint256 ethAmount;
        try vm.envUint("ETH_AMOUNT") returns (uint256 amount) {
            ethAmount = amount * 1 ether; // Convert to wei
        } catch {
            ethAmount = 0.001 ether; // Default fallback
        }
        
        // Timelock configuration - 1 hour (3600 seconds)
        uint256 lockDuration = 3600; 
        uint256 lockUntil = block.timestamp + lockDuration;
        
        // Secret from environment - convert from hex string to bytes32
        string memory secretStr = vm.envString("SECRET");
        bytes32 secret = bytes32(vm.parseBytes(secretStr));
        // Hash the secret for the contract (Ethereum uses keccak256)
        bytes32 secretHash = keccak256(abi.encodePacked(secret));
        
        vm.startBroadcast(deployerPrivateKey);

        console.log("DEPLOYING ETHEREUM TIMELOCK CONTRACT");
        console.log("====================================");
        console.log("Original Secret:", vm.toString(secret));
        console.log("Secret Hash (keccak256):", vm.toString(secretHash));
        console.log("Lock Duration:", lockDuration, "seconds (1 hour)");
        console.log("Lock Until Timestamp:", lockUntil);
        console.log("Recipient:", recipient);
        console.log("Amount:", ethAmount, "wei");
        console.log("");

        // Deploy with timelock
        EscrowSrc escrow = new EscrowSrc{value: ethAmount}(
            secretHash,
            lockUntil,
            recipient
        );

        vm.stopBroadcast();

        console.log("ETHEREUM TIMELOCK DEPLOYED!");
        console.log("Contract Address:", address(escrow));
        console.log("Locked Amount:", ethAmount, "wei");
        console.log("Lock Expires:", lockUntil);
        console.log("");
        
        console.log("Timelock Summary:");
        console.log("   Amount:", ethAmount / 1 ether, "ETH locked");
        console.log("   Duration: 1 hour");
        console.log("   Secret Hash:", vm.toString(secretHash));
        console.log("   Contract:", address(escrow));
        console.log("");
        
        console.log("Next Steps:");
        console.log("   1. Use the secret to withdraw before expiry");
        console.log("   2. Or wait for expiry to test abort/refund");
        console.log("   3. Coordinate with Cardano timelock unlock");
        console.log("");
        
        console.log("Block Explorer:");
        console.log("   https://sepolia.etherscan.io/address/", address(escrow));
    }
}
