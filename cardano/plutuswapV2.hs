{-# LANGUAGE DataKinds #-}
{-# LANGUAGE NoImplicitPrelude #-}
{-# LANGUAGE TemplateHaskell #-}
{-# LANGUAGE TypeApplications #-}
{-# LANGUAGE TypeFamilies #-}
{-# LANGUAGE RankNTypes #-}
{-# LANGUAGE NamedFieldPuns #-}
{-# LANGUAGE DerivingStrategies #-}
{-# LANGUAGE DeriveAnyClass #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE BangPatterns #-}
{-# LANGUAGE ViewPatterns #-}
{-# OPTIONS_GHC -fplugin-opt PlutusTx.Plugin:profile-all #-}
{-# OPTIONS_GHC -fplugin-opt PlutusTx.Plugin:dump-uplc #-}

module CrossChain.MintCheck
    ( mintCheckScript,
        mintCheckScriptHash,
        mintCheckAddress,
        MintCheckProof(..),
        MintCheckRedeemer(..)
    ) where

import Data.Aeson (FromJSON, ToJSON)
import GHC.Generics (Generic)
import Cardano.Api.Shelley (PlutusScript(..), PlutusScriptV2)
import Prelude hiding (($), (<>), (&&), (==), (||), (>=), (<=), (+), (<), (-), not, length, filter, (>), (!!), map, head, reverse, any, elem, snd, mconcat, negate, all)

import Codec.Serialise
import Data.ByteString.Lazy qualified as LBS
import Data.ByteString.Short qualified as SBS

import Plutus.Script.Utils.V2.Typed.Scripts qualified as PV2
import Plutus.Script.Utils.V2.Scripts as Scripts
import Plutus.V2.Ledger.Api qualified as Plutus
import Plutus.V2.Ledger.Contexts as V2
import PlutusTx qualified
import PlutusTx.Prelude hiding (SemigroupInfo(..), unless, (.))
import Ledger hiding (validatorHash)
import Plutus.V2.Ledger.Tx (OutputDatum(..))
import Ledger.Typed.Scripts (ValidatorTypes(..), TypedValidator(..), mkTypedValidatorParam)
import Data.ByteString qualified as ByteString
import Ledger.Crypto (PubKeyHash)
import Plutus.V1.Ledger.Value (valueOf, flattenValue)
import Ledger.Ada as Ada
import CrossChain.Types

-- ===================================================
-- Data Types
data MintCheckProof = MintCheckProof
    { toPkhPay :: BuiltinByteString,
        toPkhStk :: BuiltinByteString,
        policy :: BuiltinByteString,
        assetName :: BuiltinByteString,
        amount :: Integer,
        txHash :: BuiltinByteString,
        index :: Integer,
        mode :: Integer,
        uniqueId :: BuiltinByteString,
        ttl :: Integer,
        signature :: BuiltinByteString
    }
    deriving (Prelude.Eq, Show)

PlutusTx.unstableMakeIsData ''MintCheckProof
PlutusTx.makeLift ''MintCheckProof

data MintCheckProof2 = MintCheckProof2
    { subProof :: MintCheckProof,
        userData :: BuiltinByteString
    }
    deriving (Prelude.Eq, Show)

PlutusTx.unstableMakeIsData ''MintCheckProof2
PlutusTx.makeLift ''MintCheckProof2

data MintCheckRedeemer
    = BurnMintCheckToken
    | MintCheckRedeemer MintCheckProof
    | MintCheckRedeemer2 MintCheckProof2
    deriving (Show, Prelude.Eq)

PlutusTx.unstableMakeIsData ''MintCheckRedeemer

data TreasuryType

instance Scripts.ValidatorTypes TreasuryType where
    type DatumType TreasuryType = ()
    type RedeemerType TreasuryType = MintCheckRedeemer

-- ===================================================
-- Helper Functions
{-# INLINABLE verifySignature #-}
verifySignature :: Integer -> BuiltinByteString -> BuiltinByteString -> BuiltinByteString -> Bool
verifySignature mode pk hash signature
    | mode == 0 = verifyEcdsaSecp256k1Signature pk hash signature
    | mode == 1 = verifySchnorrSecp256k1Signature pk hash signature
    | mode == 2 = verifyEd25519Signature pk hash signature
    | otherwise = False

{-# INLINABLE validateTtl #-}
validateTtl :: V2.TxInfo -> Integer -> Bool
validateTtl info ttl =
    let range = V2.txInfoValidRange info
            ttlRange = to (Plutus.POSIXTime ttl)
     in ttlRange == range

{-# INLINABLE calculateHash #-}
calculateHash :: [BuiltinByteString] -> BuiltinByteString
calculateHash = sha3_256 . foldl appendByteString ""

-- ===================================================
-- Validation Logic
{-# INLINABLE burnTokenCheck #-}
burnTokenCheck :: GroupAdminNFTCheckTokenInfo -> V2.ScriptContext -> Bool
burnTokenCheck groupInfo ctx =
    traceIfFalse "Admin NFT missing in input" hasAdminNftInInput
        && traceIfFalse "Output check failed" checkOutput
    where
        info = V2.scriptContextTxInfo ctx
        hasAdminNftInInput = valueOf (V2.valueSpent info) adminNftSymbol adminNftName == 1
        checkOutput = totalCheckTokenInOutput == outputAtCheckerSum && length outputsAtChecker == outputAtCheckerSum
        totalCheckTokenInOutput = getAmountOfCheckTokenInOutput ctx checkTokenSymbol checkTokenName
        outputsAtChecker = map snd $ scriptOutputsAt' (ValidatorHash (getGroupInfoParams groupInfo MintCheckVH)) (getGroupInfoParams groupInfo StkVh) info True
        outputAtCheckerSum = valueOf (mconcat outputsAtChecker) checkTokenSymbol checkTokenName

{-# INLINABLE mintSpendCheck #-}
mintSpendCheck :: GroupAdminNFTCheckTokenInfo -> MintCheckProof -> V2.ScriptContext -> Bool
mintSpendCheck groupInfo proof ctx =
    traceIfFalse "UTxO mismatch" (hasUTxO ctx)
        && traceIfFalse "Check token output mismatch" (amountOfCheckTokenInOwnOutput == 1)
        && traceIfFalse "Signature verification failed" checkSignature
        && traceIfFalse "Minting validation failed" checkMint
        && traceIfFalse "Transaction validation failed" checkTx
        && traceIfFalse "TTL validation failed" (validateTtl info ttl)
    where
        info = V2.scriptContextTxInfo ctx
        MintCheckProof {toPkhPay, toPkhStk, policy, assetName, amount, txHash, index, mode, uniqueId, ttl, signature} = proof
        hasUTxO V2.ScriptContext {V2.scriptContextPurpose = Spending txOutRef} =
            V2.txOutRefId txOutRef == Plutus.TxId txHash && V2.txOutRefIdx txOutRef == index
        amountOfCheckTokenInOwnOutput = getAmountOfCheckTokenInOwnOutput ctx checkTokenSymbol checkTokenName (getGroupInfoParams groupInfo StkVh)
        hashRedeemer = calculateHash [toPkhPay, toPkhStk, policy, assetName, packInteger amount, txHash, packInteger index, packInteger mode, uniqueId, packInteger ttl]
        checkSignature = verifySignature mode (getGroupInfoParams groupInfo GPK) hashRedeemer signature
        checkMint = case flattenValue $ V2.txInfoMint info of
            [(symbol, name, a)] -> unCurrencySymbol symbol == policy && a == amount && unTokenName name == assetName
        checkTx =
            let receivedValue = valuePaidTo' info (PubKeyHash toPkhPay) toPkhStk
                    mintValue = V2.txInfoMint info
                    symbol = CurrencySymbol policy
                    tokenName = TokenName assetName
             in valueOf receivedValue symbol tokenName == valueOf mintValue symbol tokenName && length (flattenValue receivedValue) == 2

-- ===================================================
-- Validator
{-# INLINABLE mkValidator #-}
mkValidator :: GroupAdminNFTCheckTokenInfo -> () -> MintCheckRedeemer -> V2.ScriptContext -> Bool
mkValidator groupInfo _ redeemer ctx = case redeemer of
    BurnMintCheckToken -> burnTokenCheck groupInfo ctx
    MintCheckRedeemer proof -> mintSpendCheck groupInfo proof ctx
    MintCheckRedeemer2 proof2 -> mintSpendCheck groupInfo (subProof proof2) ctx

typedValidator :: GroupAdminNFTCheckTokenInfo -> PV2.TypedValidator TreasuryType
typedValidator = PV2.mkTypedValidatorParam @TreasuryType
    $$(PlutusTx.compile [|| mkValidator ||])
    $$(PlutusTx.compile [|| wrap ||])
    where
        wrap = PV2.mkUntypedValidator

validator :: GroupAdminNFTCheckTokenInfo -> Validator
validator = PV2.validatorScript . typedValidator

script :: GroupAdminNFTCheckTokenInfo -> Plutus.Script
script = unValidatorScript . validator

mintCheckScript :: GroupAdminNFTCheckTokenInfo -> PlutusScript PlutusScriptV2
mintCheckScript = PlutusScriptSerialised . SBS.toShort . LBS.toStrict . serialise . script

mintCheckScriptHash :: GroupAdminNFTCheckTokenInfo -> Plutus.ValidatorHash
mintCheckScriptHash = PV2.validatorHash . typedValidator

mintCheckAddress :: GroupAdminNFTCheckTokenInfo -> Ledger.Address
mintCheckAddress = PV2.validatorAddress . typedValidator
