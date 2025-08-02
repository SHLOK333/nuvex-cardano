import {
  deserializeAddress,
  serializeAddressObj,
  MeshTxBuilder,
  BlockfrostProvider,
  serializePlutusScript,
  resolveScriptHash,
  mConStr0,
  mConStr1,
} from "@meshsdk/core";
import crypto from 'crypto';

import {
  owner_wallet,
  beneficiary_wallet,
  blockchainProvider,
} from "./common.js";

// Read the compiled timelock contract
import fs from 'fs';
const timelockPlutus = JSON.parse(fs.readFileSync('./escrow/plutus.json', 'utf8'));

// HTLC Timelock Contract Implementation
class HTLCTimelock {
  constructor() {
    this.apiKey = process.env.BLOCKFROST_API_KEY || "preprodW6yFOJTcrTvV2LR6UvlDyuLVxVaxXwx5";
    this.provider = new BlockfrostProvider(this.apiKey);
  }

  // Create timelock contract address
  async createTimelockContract(secretHash, beneficiaryPkh, refundPkh, lockUntilTimestamp) {
    // Find the HTLC timelock validator in the compiled contract
    const htlcValidator = timelockPlutus.validators.find(
      v => v.title === "htlc_timelock"
    );
    
    if (!htlcValidator) {
      throw new Error("HTLC Timelock validator not found in compiled contract");
    }

    // Apply parameters to the script
    const script = {
      code: htlcValidator.compiledCode,
      version: "V3"
    };

    // Apply the parameters: secret_hash, beneficiary, refund_to, lock_until
    const scriptWithParams = serializePlutusScript(
      script,
      [secretHash, beneficiaryPkh, refundPkh, lockUntilTimestamp],
      "V3"
    );

    // Get script hash and address
    const scriptHash = resolveScriptHash(scriptWithParams, "V3");
    const scriptAddr = serializeAddressObj({
      paymentCredential: {
        type: "Script",
        hash: scriptHash,
      },
      networkId: 0, // Testnet
    });

    return {
      script: scriptWithParams,
      scriptHash,
      scriptAddr,
      secretHash,
      beneficiaryPkh,
      refundPkh,
      lockUntil: lockUntilTimestamp
    };
  }

  // Lock ADA with timelock
  async lockFundsWithTimelock(amountLovelace, lockDurationHours = 24) {
    try {
      console.log("🔒 CREATING HTLC TIMELOCK CONTRACT");
      console.log("═══════════════════════════════════");
      
      // Generate secret and hash
      const secret = "0000000000000000000000000000000000000000000000000000000000000000";
      const secretHash = crypto.createHash('sha256').update(Buffer.from(secret, 'hex')).digest('hex');
      
      // Get wallet addresses
      const beneficiaryAddr = await beneficiary_wallet.getChangeAddress();
      const ownerAddr = await owner_wallet.getChangeAddress();
      
      const { pubKeyHash: beneficiaryPkh } = deserializeAddress(beneficiaryAddr);
      const { pubKeyHash: ownerPkh } = deserializeAddress(ownerAddr);
      
      // Calculate timelock expiry
      const now = Math.floor(Date.now() / 1000);
      const lockUntil = now + (lockDurationHours * 60 * 60);
      
      console.log("⏰ Timelock Configuration:");
      console.log(`   Duration: ${lockDurationHours} hours`);
      console.log(`   Lock Until: ${new Date(lockUntil * 1000).toISOString()}`);
      console.log(`   Secret Hash: ${secretHash}`);
      console.log(`   Beneficiary: ${beneficiaryPkh}`);
      console.log(`   Refund To: ${ownerPkh}`);
      console.log("");
      
      // Create timelock contract
      const contract = await this.createTimelockContract(
        secretHash,
        beneficiaryPkh,
        ownerPkh,
        lockUntil
      );
      
      console.log("📋 Contract Details:");
      console.log(`   Script Address: ${contract.scriptAddr}`);
      console.log(`   Script Hash: ${contract.scriptHash}`);
      console.log("");
      
      // Build lock transaction
      const txBuilder = new MeshTxBuilder({
        fetcher: this.provider,
        submitter: this.provider,
        networkId: 0,
      });
      
      // Create empty datum (parameters are in the script)
      const datum = mConStr0([]);
      
      txBuilder
        .txOut(contract.scriptAddr, [{ unit: "lovelace", quantity: amountLovelace.toString() }])
        .txOutInlineDatum(datum)
        .changeAddress(ownerAddr);
      
      console.log("🔧 Building lock transaction...");
      const completedTx = await txBuilder.complete();
      
      console.log("🔐 Signing transaction...");
      const signedTx = await owner_wallet.signTx(completedTx);
      
      console.log("📤 Submitting transaction...");
      const txHash = await owner_wallet.submitTx(signedTx);
      
      console.log("✅ HTLC Lock Transaction Successful!");
      console.log(`   Transaction Hash: ${txHash}`);
      console.log(`   Explorer: https://preprod.cardanoscan.io/transaction/${txHash}`);
      console.log("");
      
      return {
        txHash,
        contract,
        secret,
        lockUntil
      };
      
    } catch (error) {
      console.error("❌ Error creating timelock:", error);
      throw error;
    }
  }

  // Unlock with secret (before expiry)
  async unlockWithSecret(contract, secret, lockTxHash) {
    try {
      console.log("🔓 UNLOCKING WITH SECRET (Before Expiry)");
      console.log("═══════════════════════════════════════");
      
      const now = Math.floor(Date.now() / 1000);
      const timeRemaining = contract.lockUntil - now;
      
      if (timeRemaining <= 0) {
        throw new Error("⚠️ Timelock has expired! Use refund method instead.");
      }
      
      console.log(`⏳ Time remaining: ${Math.floor(timeRemaining / 3600)}h ${Math.floor((timeRemaining % 3600) / 60)}m`);
      
      // Get UTXO from lock transaction
      const utxo = await this.getUtxoByTxHash(lockTxHash, contract.scriptAddr);
      
      // Get beneficiary address
      const beneficiaryAddr = await beneficiary_wallet.getChangeAddress();
      
      const txBuilder = new MeshTxBuilder({
        fetcher: this.provider,
        submitter: this.provider,
        networkId: 0,
      });
      
      // Create secret reveal redeemer
      const redeemer = mConStr0([secret]); // SecretReveal variant
      
      // Set validity range (before expiry)
      const validUntil = contract.lockUntil - 1;
      
      txBuilder
        .spendingPlutusScript("V3")
        .txIn(utxo.input.txHash, utxo.input.outputIndex, utxo.output.amount, contract.scriptAddr)
        .spendingReferenceTxInInlineDatumPresent()
        .spendingReferenceTxInRedeemerValue(redeemer)
        .txInScript(contract.script)
        .txOut(beneficiaryAddr, utxo.output.amount)
        .invalidHereafter(validUntil)
        .changeAddress(beneficiaryAddr);
      
      console.log("🔧 Building unlock transaction...");
      const completedTx = await txBuilder.complete();
      
      console.log("🔐 Signing transaction...");
      const signedTx = await beneficiary_wallet.signTx(completedTx);
      
      console.log("📤 Submitting transaction...");
      const txHash = await beneficiary_wallet.submitTx(signedTx);
      
      console.log("✅ Secret Unlock Successful!");
      console.log(`   Transaction Hash: ${txHash}`);
      console.log(`   Explorer: https://preprod.cardanoscan.io/transaction/${txHash}`);
      
      return txHash;
      
    } catch (error) {
      console.error("❌ Error unlocking with secret:", error);
      throw error;
    }
  }

  // Refund after expiry
  async refundAfterExpiry(contract, lockTxHash) {
    try {
      console.log("🔄 REFUNDING AFTER EXPIRY");
      console.log("═════════════════════════");
      
      const now = Math.floor(Date.now() / 1000);
      const timeRemaining = contract.lockUntil - now;
      
      if (timeRemaining > 0) {
        throw new Error(`⚠️ Timelock not yet expired! Wait ${Math.floor(timeRemaining / 3600)}h ${Math.floor((timeRemaining % 3600) / 60)}m more.`);
      }
      
      console.log("✅ Timelock has expired, refund available");
      
      // Get UTXO from lock transaction
      const utxo = await this.getUtxoByTxHash(lockTxHash, contract.scriptAddr);
      
      // Get owner address
      const ownerAddr = await owner_wallet.getChangeAddress();
      
      const txBuilder = new MeshTxBuilder({
        fetcher: this.provider,
        submitter: this.provider,
        networkId: 0,
      });
      
      // Create refund claim redeemer
      const redeemer = mConStr1([]); // RefundClaim variant
      
      // Set validity range (after expiry)
      const validFrom = contract.lockUntil + 1;
      
      txBuilder
        .spendingPlutusScript("V3")
        .txIn(utxo.input.txHash, utxo.input.outputIndex, utxo.output.amount, contract.scriptAddr)
        .spendingReferenceTxInInlineDatumPresent()
        .spendingReferenceTxInRedeemerValue(redeemer)
        .txInScript(contract.script)
        .txOut(ownerAddr, utxo.output.amount)
        .invalidBefore(validFrom)
        .requiredSignerHash(contract.refundPkh)
        .changeAddress(ownerAddr);
      
      console.log("🔧 Building refund transaction...");
      const completedTx = await txBuilder.complete();
      
      console.log("🔐 Signing transaction...");
      const signedTx = await owner_wallet.signTx(completedTx);
      
      console.log("📤 Submitting transaction...");
      const txHash = await owner_wallet.submitTx(signedTx);
      
      console.log("✅ Refund Successful!");
      console.log(`   Transaction Hash: ${txHash}`);
      console.log(`   Explorer: https://preprod.cardanoscan.io/transaction/${txHash}`);
      
      return txHash;
      
    } catch (error) {
      console.error("❌ Error processing refund:", error);
      throw error;
    }
  }

  // Utility: Get UTXO by transaction hash
  async getUtxoByTxHash(txHash, scriptAddr) {
    const response = await fetch(
      `https://cardano-preprod.blockfrost.io/api/v0/txs/${txHash}/utxos`,
      { headers: { 'project_id': this.apiKey } }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch UTXO: ${response.statusText}`);
    }
    
    const data = await response.json();
    const scriptOutput = data.outputs.find(output => output.address === scriptAddr);
    
    if (!scriptOutput) {
      throw new Error(`No UTXO found at script address`);
    }
    
    return {
      input: {
        outputIndex: scriptOutput.output_index,
        txHash: txHash,
      },
      output: {
        address: scriptOutput.address,
        amount: scriptOutput.amount,
      },
    };
  }
}

// Demo function
async function demonstrateTimelock() {
  console.log("🚀 HTLC TIMELOCK DEMONSTRATION");
  console.log("══════════════════════════════");
  console.log("");
  
  const htlc = new HTLCTimelock();
  
  try {
    // Demo: Lock 3 ADA with 1-hour timelock
    console.log("📋 Step 1: Locking 3 ADA with 1-hour timelock...");
    const lockResult = await htlc.lockFundsWithTimelock("3000000", 1); // 1 hour
    
    console.log("📋 Step 2: You can now either:");
    console.log("   🔓 Unlock with secret (before expiry):");
    console.log(`      htlc.unlockWithSecret(contract, "${lockResult.secret}", "${lockResult.txHash}")`);
    console.log("");
    console.log("   🔄 Or wait for expiry and refund:");
    console.log(`      htlc.refundAfterExpiry(contract, "${lockResult.txHash}")`);
    console.log("");
    
    console.log("🎯 Contract Details:");
    console.log(`   Script Address: ${lockResult.contract.scriptAddr}`);
    console.log(`   Lock Until: ${new Date(lockResult.lockUntil * 1000).toISOString()}`);
    console.log(`   Secret: ${lockResult.secret}`);
    console.log("");
    
    return lockResult;
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
  }
}

export { HTLCTimelock, demonstrateTimelock };

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateTimelock();
}
