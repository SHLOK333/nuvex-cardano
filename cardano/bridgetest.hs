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

module CrossChain.TreasuryCheck
    ( treasuryCheckScript,
        treasuryCheckScriptHash,
        treasuryCheckAddress,
        TreasuryCheckProof (..),
        TreasuryCheckRedeemer (..),
        TreasuryCheckParams (..),
    ) where

import Cardano.Api.Shelley (PlutusScript (..), PlutusScriptV2)
import Codec.Serialise
import Data.ByteString.Lazy qualified as LBS
import Data.ByteString.Short qualified as SBS
import GHC.Generics (Generic)
import Ledger
import Ledger.Ada as Ada
import Ledger.Crypto (PubKeyHash)
import Ledger.Typed.Scripts (ValidatorTypes (..))
import Plutus.Script.Utils.V2.Scripts as Scripts
import Plutus.Script.Utils.V2.Typed.Scripts qualified as PV2
import Plutus.V2.Ledger.Api qualified as Plutus
import Plutus.V2.Ledger.Contexts as V2
import Plutus.V2.Ledger.Tx (OutputDatum (..))
import PlutusTx qualified
import PlutusTx.Builtins
import PlutusTx.Prelude hiding (SemigroupInfo (..), (.))
import Prelude hiding (($), (<>), (&&), (==), (||), (>=), (<=), (<), (-), (/=), not, length, filter, (>), (+), map, any, elem, fst, snd, mconcat)

import CrossChain.Types

data TreasuryCheckProof = TreasuryCheckProof
    { toPkhPay :: BuiltinByteString,
        toPkhStk :: BuiltinByteString,
        policy :: BuiltinByteString,
        assetName :: BuiltinByteString,
        amount :: Integer,
        adaAmount :: Integer,
        txHash :: BuiltinByteString,
        index :: Integer,
        mode :: Integer,
        uniqueId :: BuiltinByteString,
        txType :: Integer,
        ttl :: Integer,
        outputCount :: Integer,
        signature :: BuiltinByteString
    }
    deriving (Prelude.Eq, Show)

PlutusTx.unstableMakeIsData ''TreasuryCheckProof
PlutusTx.makeLift ''TreasuryCheckProof

data TreasuryCheckRedeemer
    = BurnTreasuryCheckToken
    | TreasuryCheckRedeemer TreasuryCheckProof
    deriving (Show, Prelude.Eq)

PlutusTx.unstableMakeIsData ''TreasuryCheckRedeemer

data TreasuryType

instance Scripts.ValidatorTypes TreasuryType where
    type instance DatumType TreasuryType = ()
    type instance RedeemerType TreasuryType = TreasuryCheckRedeemer

data TreasuryCheckParams = TreasuryCheckParams
    { tokenInfos :: GroupAdminNFTCheckTokenInfo,
        treasury :: ValidatorHash
    }
    deriving (Generic, Prelude.Eq)

PlutusTx.unstableMakeIsData ''TreasuryCheckParams
PlutusTx.makeLift ''TreasuryCheckParams

{-# INLINABLE burnTokenCheck #-}
burnTokenCheck :: TreasuryCheckParams -> V2.ScriptContext -> Bool
burnTokenCheck (TreasuryCheckParams (GroupAdminNFTCheckTokenInfo (GroupNFTTokenInfo groupInfoCurrency groupInfoTokenName) (AdminNftTokenInfo adminNftSymbol adminNftName) (CheckTokenInfo checkTokenSymbol checkTokenName)) treasury) ctx =
    traceIfFalse "a" hasAdminNftInInput
        && traceIfFalse "b" checkOutPut
        && traceIfFalse "ti" (not hasTreasuryInput)
    where
        info = V2.scriptContextTxInfo ctx

        hasAdminNftInInput =
            let totalInputValue = V2.valueSpent info
                    amount = valueOf totalInputValue adminNftSymbol adminNftName
             in amount == 1

        checkOutPut =
            let totalAmountOfCheckTokenInOutput = getAmountOfCheckTokenInOutput ctx checkTokenSymbol checkTokenName
                    outputsAtChecker = map snd $ scriptOutputsAt' treasury (getGroupInfoParams groupInfo StkVh) info True
                    outputAtCheckerSum = valueOf (mconcat outputsAtChecker) checkTokenSymbol checkTokenName
             in totalAmountOfCheckTokenInOutput == outputAtCheckerSum && length outputsAtChecker == outputAtCheckerSum

        isTreasuryInput (V2.TxInInfo _ (V2.TxOut (Address addressCredential _) _ _ _)) =
            case addressCredential of
                Plutus.ScriptCredential s -> s == treasury
                _ -> False

        hasTreasuryInput = any isTreasuryInput $ V2.txInfoInputs info

{-# INLINABLE mkValidator #-}
mkValidator :: TreasuryCheckParams -> () -> TreasuryCheckRedeemer -> V2.ScriptContext -> Bool
mkValidator params _ redeemer ctx =
    case redeemer of
        BurnTreasuryCheckToken -> burnTokenCheck params ctx
        TreasuryCheckRedeemer proof -> treasurySpendCheck params proof ctx

typedValidator :: TreasuryCheckParams -> PV2.TypedValidator TreasuryType
typedValidator = PV2.mkTypedValidatorParam @TreasuryType
    $$(PlutusTx.compile [||mkValidator||])
    $$(PlutusTx.compile [||wrap||])
    where
        wrap = PV2.mkUntypedValidator

validator :: TreasuryCheckParams -> Validator
validator = PV2.validatorScript . typedValidator

script :: TreasuryCheckParams -> Plutus.Script
script = unValidatorScript . validator

treasuryCheckScript :: TreasuryCheckParams -> PlutusScript PlutusScriptV2
treasuryCheckScript p =
    PlutusScriptSerialised . SBS.toShort . LBS.toStrict $ serialise (script p)

treasuryCheckScriptHash :: TreasuryCheckParams -> Plutus.ValidatorHash
treasuryCheckScriptHash = PV2.validatorHash . typedValidator

treasuryCheckAddress :: TreasuryCheckParams -> Ledger.Address
treasuryCheckAddress = PV2.validatorAddress . typedValidator
