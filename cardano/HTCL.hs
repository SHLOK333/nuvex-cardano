{-# LANGUAGE DataKinds                  #-}
{-# LANGUAGE NoImplicitPrelude          #-}
{-# LANGUAGE TemplateHaskell            #-}
{-# LANGUAGE ScopedTypeVariables        #-}
{-# LANGUAGE MultiParamTypeClasses      #-}
{-# LANGUAGE TypeApplications           #-}
{-# LANGUAGE TypeFamilies               #-}
{-# LANGUAGE DeriveAnyClass             #-}
{-# LANGUAGE DeriveGeneric              #-}

module HTLC_SHA256_ADA_TO_ETH where

import Plutus.V2.Ledger.Api
import PlutusTx
import PlutusTx.Prelude hiding (Semigroup(..), unless)
import Prelude (Show)

-- | Datum includes the SHA-256 hash of the secret and a timelock (deadline).
data HTLCDatum = HTLCDatum
    { hashlock :: BuiltinByteString  -- sha2_256(secret)
    , timelock :: POSIXTime          -- deadline
    } deriving Show

PlutusTx.unstableMakeIsData ''HTLCDatum
PlutusTx.makeLift ''HTLCDatum

-- | Redeemer is either revealing the secret or requesting refund
data HTLCRedeemer = Redeem BuiltinByteString | Refund
    deriving Show

PlutusTx.unstableMakeIsData ''HTLCRedeemer
PlutusTx.makeLift ''HTLCRedeemer

-- | Main validation function
{-# INLINABLE mkHTLCValidator #-}
mkHTLCValidator :: HTLCDatum -> HTLCRedeemer -> ScriptContext -> Bool
mkHTLCValidator datum redeemer ctx =
    case redeemer of
        Redeem secret ->
            traceIfFalse "Invalid secret" (sha2_256 secret == hashlock datum) &&
            traceIfFalse "Too late"       (to (timelock datum) `contains` txInfoValidRange info)
        Refund ->
            traceIfFalse "Too early"      (from (timelock datum) `contains` txInfoValidRange info)
  where
    info :: TxInfo
    info = scriptContextTxInfo ctx

-- | Wrap validator for on-chain use
{-# INLINABLE wrappedValidator #-}
wrappedValidator :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedValidator d r ctx =
    check $ mkHTLCValidator
        (PlutusTx.unsafeFromBuiltinData d)
        (PlutusTx.unsafeFromBuiltinData r)
        (PlutusTx.unsafeFromBuiltinData ctx)

validator :: Validator
validator = mkValidatorScript $$(PlutusTx.compile [|| wrappedValidator ||])
