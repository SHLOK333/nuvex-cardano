use aiken/builtin.{sha2_256}
use cardano/transaction.{OutputReference, Transaction}
use cardano/address.{Address}
use cardano/address/credential.{VerificationKey}

// HTLC (Hash Time Locked Contract) Datum
type HTLCDatum {
  secret_hash: ByteArray,
  beneficiary: ByteArray,  // pub key hash
  refund_to: ByteArray,    // pub key hash  
  lock_until: Int,         // POSIX timestamp
}

// Redeemer for HTLC operations
type HTLCRedeemer {
  SecretReveal { secret: ByteArray }
  RefundClaim
}

fn check_secret_hash(secret: ByteArray, expected_hash: ByteArray) -> Bool {
  sha2_256(secret) == expected_hash
}

fn check_time_validity(tx: Transaction, lock_until: Int, before_expiry: Bool) -> Bool {
  when tx.validity_range.upper_bound is {
    Some(upper) -> if before_expiry { upper < lock_until } else { upper >= lock_until }
    None -> False
  }
}

fn check_payment_to_address(tx: Transaction, target_pkh: ByteArray) -> Bool {
  when tx.outputs is {
    [first, ..] -> 
      when first.address.payment_credential is {
        VerificationKey(pkh) -> pkh == target_pkh
        _ -> False
      }
    [] -> False
  }
}

fn check_signed_by(tx: Transaction, required_signer: ByteArray) -> Bool {
  when tx.extra_signatories is {
    [signer, ..] -> signer == required_signer
    [] -> False
  }
}

validator htlc_timelock(
  secret_hash: ByteArray,
  beneficiary: ByteArray, 
  refund_to: ByteArray,
  lock_until: Int
) {
  spend(
    datum_opt: Option<Data>,
    redeemer: Data,
    _input: OutputReference,
    tx: Transaction,
  ) {
    // Decode redeemer to determine unlock path
    expect redeemer_type: HTLCRedeemer = redeemer
    
    when redeemer_type is {
      // Path 1: Reveal secret before timelock expires
      SecretReveal { secret } -> {
        and {
          check_secret_hash(secret, secret_hash),
          check_time_validity(tx, lock_until, True),  // before expiry
          check_payment_to_address(tx, beneficiary),
        }
      }
      
      // Path 2: Refund after timelock expires  
      RefundClaim -> {
        and {
          check_time_validity(tx, lock_until, False), // after expiry
          check_payment_to_address(tx, refund_to),
          check_signed_by(tx, refund_to),
        }
      }
    }
  }
}
