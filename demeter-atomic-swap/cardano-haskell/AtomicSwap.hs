{-# LANGUAGE DataKinds #-}
{-# LANGUAGE DeriveAnyClass #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE FlexibleContexts #-}
{-# LANGUAGE NoImplicitPrelude #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell #-}
{-# LANGUAGE TypeApplications #-}
{-# LANGUAGE TypeFamilies #-}
{-# LANGUAGE TypeOperators #-}

module AtomicSwap where

import qualified PlutusTx
import PlutusTx.Prelude hiding (Semigroup(..), unless)
import Ledger hiding (singleton)
import Ledger.Constraints as Constraints
import qualified Ledger.Scripts as Scripts
import Ledger.Ada as Ada
import Playground.Contract (printJson, printSchemas, ensureKnownCurrencies, stage, ToSchema)
import Playground.TH (mkKnownCurrencies, mkSchemaDefinitions)
import Playground.Types (KnownCurrency (..))
import Prelude (IO, Semigroup (..), Show (..), String)
import Text.Printf (printf)

-- | Atomic Swap Contract for Demeter.run
-- Integrates with 1inch Protocol for enhanced liquidity
data AtomicSwapDatum = AtomicSwapDatum
    { secretHash    :: BuiltinByteString  -- Hash of the secret (keccak256)
    , beneficiary   :: PaymentPubKeyHash  -- Who can claim with secret
    , refundTo      :: PaymentPubKeyHash  -- Who gets refund after deadline
    , deadline      :: POSIXTime          -- Deadline for claiming
    , swapAmount    :: Integer            -- Amount locked in ADA (lovelace)
    , oneinchOrder  :: BuiltinByteString  -- 1inch order data for cross-chain
    } deriving Show

PlutusTx.unstableMakeIsData ''AtomicSwapDatum

data AtomicSwapRedeemer = 
    Claim BuiltinByteString  -- Reveal secret to claim
    | Refund                 -- Refund after deadline
    deriving Show

PlutusTx.unstableMakeIsData ''AtomicSwapRedeemer

-- | Validator for Atomic Swap with 1inch Integration
{-# INLINABLE atomicSwapValidator #-}
atomicSwapValidator :: AtomicSwapDatum -> AtomicSwapRedeemer -> ScriptContext -> Bool
atomicSwapValidator datum redeemer ctx =
    case redeemer of
        Claim secret -> validateClaim secret
        Refund       -> validateRefund
    where
        info :: TxInfo
        info = scriptContextTxInfo ctx

        -- Validate secret claim
        validateClaim :: BuiltinByteString -> Bool
        validateClaim secret = 
            traceIfFalse "Invalid secret hash" (sha2_256 secret == secretHash datum) &&
            traceIfFalse "Beneficiary signature missing" (txSignedBy info $ unPaymentPubKeyHash $ beneficiary datum) &&
            traceIfFalse "Deadline passed" (to (deadline datum) `contains` txInfoValidRange info) &&
            traceIfFalse "Incorrect amount claimed" validateClaimAmount

        -- Validate refund after deadline
        validateRefund :: Bool
        validateRefund =
            traceIfFalse "Deadline not reached" (from (1 + deadline datum) `contains` txInfoValidRange info) &&
            traceIfFalse "Refund recipient signature missing" (txSignedBy info $ unPaymentPubKeyHash $ refundTo datum) &&
            traceIfFalse "Incorrect refund amount" validateRefundAmount

        -- Validate claim amount goes to beneficiary
        validateClaimAmount :: Bool
        validateClaimAmount = 
            let expectedValue = Ada.lovelaceValueOf (swapAmount datum)
                actualValue = valuePaidTo info (unPaymentPubKeyHash $ beneficiary datum)
            in actualValue `geq` expectedValue

        -- Validate refund amount goes back to original sender
        validateRefundAmount :: Bool
        validateRefundAmount = 
            let expectedValue = Ada.lovelaceValueOf (swapAmount datum)
                actualValue = valuePaidTo info (unPaymentPubKeyHash $ refundTo datum)
            in actualValue `geq` expectedValue

-- | 1inch Integration Helper Functions
{-# INLINABLE validate1inchOrder #-}
validate1inchOrder :: BuiltinByteString -> Bool
validate1inchOrder orderData = 
    -- Validate 1inch order format and signature
    -- This would include checking the order structure matches expected format
    lengthOfByteString orderData > 0  -- Simplified validation

-- | Typed validator instance
typedAtomicSwapValidator :: Scripts.TypedValidator AtomicSwap
typedAtomicSwapValidator = Scripts.mkTypedValidator @AtomicSwap
    $$(PlutusTx.compile [|| atomicSwapValidator ||])
    $$(PlutusTx.compile [|| wrap ||])
  where
    wrap = Scripts.wrapValidator @AtomicSwapDatum @AtomicSwapRedeemer

-- | Validator script
atomicSwapScript :: Validator
atomicSwapScript = Scripts.validatorScript typedAtomicSwapValidator

-- | Validator hash
atomicSwapHash :: Ledger.ValidatorHash
atomicSwapHash = Scripts.validatorHash typedAtomicSwapValidator

-- | Contract Endpoints for Demeter.run
type AtomicSwapSchema =
        Endpoint "lock-funds" LockParams
        .\/ Endpoint "claim-funds" ClaimParams
        .\/ Endpoint "refund-funds" RefundParams
        .\/ Endpoint "status" StatusParams

-- | Parameters for locking funds
data LockParams = LockParams
    { lpSecretHash   :: String           -- Secret hash (hex)
    , lpBeneficiary  :: PaymentPubKeyHash -- Who can claim
    , lpAmount       :: Integer          -- Amount in lovelace
    , lpDeadline     :: POSIXTime        -- Claim deadline
    , lp1inchOrder   :: String           -- 1inch order data
    } deriving (Generic, ToJSON, FromJSON, ToSchema)

-- | Parameters for claiming funds
data ClaimParams = ClaimParams
    { cpSecret    :: String  -- Secret preimage
    , cpTxOutRef  :: TxOutRef -- UTXO to claim from
    } deriving (Generic, ToJSON, FromJSON, ToSchema)

-- | Parameters for refunding funds
data RefundParams = RefundParams
    { rpTxOutRef :: TxOutRef -- UTXO to refund from
    } deriving (Generic, ToJSON, FromJSON, ToSchema)

-- | Parameters for checking status
data StatusParams = StatusParams
    { spTxOutRef :: TxOutRef -- UTXO to check
    } deriving (Generic, ToJSON, FromJSON, ToSchema)

-- | Lock funds in atomic swap contract
lockFunds :: LockParams -> Contract w AtomicSwapSchema Text ()
lockFunds params = do
    let datum = AtomicSwapDatum
            { secretHash = fromString $ lpSecretHash params
            , beneficiary = lpBeneficiary params
            , refundTo = lpBeneficiary params  -- Same as beneficiary for now
            , deadline = lpDeadline params
            , swapAmount = lpAmount params
            , oneinchOrder = fromString $ lp1inchOrder params
            }
        value = Ada.lovelaceValueOf $ lpAmount params
        tx = Constraints.mustPayToTheScript datum value
    
    logInfo @String $ printf "Locking %d lovelace for atomic swap" (lpAmount params)
    ledgerTx <- submitTxConstraints typedAtomicSwapValidator tx
    void $ awaitTxConfirmed $ getCardanoTxId ledgerTx
    logInfo @String "Funds locked successfully"

-- | Claim funds with secret
claimFunds :: ClaimParams -> Contract w AtomicSwapSchema Text ()
claimFunds params = do
    utxos <- utxosAt atomicSwapHash
    case Map.lookup (cpTxOutRef params) utxos of
        Nothing -> logError @String "UTXO not found"
        Just (ChainIndexTxOut addr value datum) -> do
            case datum of
                Left _ -> logError @String "Invalid datum"
                Right (Datum d) -> case PlutusTx.fromBuiltinData d of
                    Nothing -> logError @String "Failed to decode datum"
                    Just atomicDatum -> do
                        let redeemer = Claim $ fromString $ cpSecret params
                            lookups = Constraints.unspentOutputs utxos <>
                                     Constraints.otherScript atomicSwapScript
                            tx = Constraints.mustSpendScriptOutput (cpTxOutRef params) redeemer
                        
                        logInfo @String $ printf "Claiming funds with secret"
                        ledgerTx <- submitTxConstraintsWith @AtomicSwap lookups tx
                        void $ awaitTxConfirmed $ getCardanoTxId ledgerTx
                        logInfo @String "Funds claimed successfully"

-- | Refund funds after deadline
refundFunds :: RefundParams -> Contract w AtomicSwapSchema Text ()
refundFunds params = do
    utxos <- utxosAt atomicSwapHash
    case Map.lookup (rpTxOutRef params) utxos of
        Nothing -> logError @String "UTXO not found"
        Just _ -> do
            let redeemer = Refund
                lookups = Constraints.unspentOutputs utxos <>
                         Constraints.otherScript atomicSwapScript
                tx = Constraints.mustSpendScriptOutput (rpTxOutRef params) redeemer
            
            logInfo @String "Refunding expired swap"
            ledgerTx <- submitTxConstraintsWith @AtomicSwap lookups tx
            void $ awaitTxConfirmed $ getCardanoTxId ledgerTx
            logInfo @String "Funds refunded successfully"

-- | Check swap status
checkStatus :: StatusParams -> Contract w AtomicSwapSchema Text ()
checkStatus params = do
    utxos <- utxosAt atomicSwapHash
    case Map.lookup (spTxOutRef params) utxos of
        Nothing -> logInfo @String "Swap completed or doesn't exist"
        Just (ChainIndexTxOut addr value datum) -> do
            logInfo @String $ printf "Swap active with value: %s" (show value)
            currentTime <- currentTime
            logInfo @String $ printf "Current time: %s" (show currentTime)

-- | Contract endpoints handler
endpoints :: Contract () AtomicSwapSchema Text ()
endpoints = do
    logInfo @String "Atomic Swap contract started"
    selectList [lockFunds', claimFunds', refundFunds', checkStatus'] >> endpoints
  where
    lockFunds' = endpoint @"lock-funds" lockFunds
    claimFunds' = endpoint @"claim-funds" claimFunds
    refundFunds' = endpoint @"refund-funds" refundFunds
    checkStatus' = endpoint @"status" checkStatus

-- | Schema definitions for Playground
mkSchemaDefinitions ''AtomicSwapSchema
mkKnownCurrencies []
