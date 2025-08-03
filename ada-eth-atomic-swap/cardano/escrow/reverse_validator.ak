use aiken/builtin.{keccak_256}
use cardano/transaction.{OutputReference, Transaction}
use cocktail/vodka_validity_range.{valid_before}
use mocktail.{complete, invalid_hereafter, mocktail_tx}

fn check_hash(secret: ByteArray, hash: ByteArray) -> Bool {
  trace keccak_256(secret)
  keccak_256(secret) == hash
}

validator escrow(hash: ByteArray, lock_until: Int) {
  spend(
    _datum_opt: Option<Data>,
    redeemer: ByteArray,
    _input: OutputReference,
    tx: Transaction,
  ) {
    and {
      True,
      // valid_before(tx.validity_range, lock_until),
      check_hash(redeemer, hash),
    }
  }

  else(_) {
    fail
  }
}

test smoke() {
  let placeholder_utxo = OutputReference { transaction_id: "", output_index: 0 }
  let tx =
    mocktail_tx()
      |> invalid_hereafter(True, 1672843961001)
      |> complete()
  escrow.spend(
    #"290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563",
    3000000000000,
    None,
    #"0000000000000000000000000000000000000000000000000000000000000000",
    placeholder_utxo,
    tx,
  )
} 