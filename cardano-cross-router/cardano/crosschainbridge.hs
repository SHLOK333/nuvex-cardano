{-# LANGUAGE DataKinds         #-}
{-# LANGUAGE NoImplicitPrelude #-}
{-# LANGUAGE TemplateHaskell   #-}
{-# LANGUAGE TypeApplications  #-}
{-# LANGUAGE TypeFamilies      #-}
{-# LANGUAGE RankNTypes        #-}
{-# LANGUAGE NamedFieldPuns    #-}
{-# LANGUAGE DerivingStrategies #-}
{-# LANGUAGE DeriveAnyClass     #-}
{-# LANGUAGE DeriveGeneric      #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE BangPatterns       #-}
{-# LANGUAGE ViewPatterns       #-}

module CrossChain.Treasury
    ( treasuryScript
    , treasuryScriptHash
    , treasuryAddress
    , CheckTokenInfo (..)
    ) where

import Data.Aeson (FromJSON, ToJSON)
import GHC.Generics (Generic)
import Cardano.Api.Shelley (PlutusScript (..), PlutusScriptV2)
import Prelude hiding (($), (<>), (&&), (||), (>=), (<), (==), (-), not, length, filter, foldMap, (>), (!!), map, head, reverse, any, elem, snd, mconcat, negate, divide)

import Codec.Serialise
import Data.ByteString.Lazy qualified as LBS
import Data.ByteString.Short qualified as SBS

import Plutus.Script.Utils.V2.Typed.Scripts qualified as PV2
import Plutus.Script.Utils.V2.Scripts as Scripts
import Plutus.V2.Ledger.Api qualified as Plutus
import Plutus.V2.Ledger.Contexts as V2
import PlutusTx qualified
import PlutusTx.Builtins
import PlutusTx.Prelude hiding (SemigroupInfo (..), unless, (.))
import Ledger hiding (validatorHash)
import Plutus.V2.Ledger.Tx (isPayToScriptOut, OutputDatum (..))
import Ledger.Typed.Scripts (ValidatorTypes (..), TypedValidator (..), mkTypedValidator, mkTypedValidatorParam)
import Data.ByteString qualified as ByteString
import Ledger.Crypto (PubKey (..), PubKeyHash, pubKeyHash)
import Plutus.V1.Ledger.Bytes (LedgerBytes (LedgerBytes), fromBytes, getLedgerBytes)
import Ledger.Ada as Ada
import Plutus.V1.Ledger.Value (valueOf, currencySymbol, tokenName, symbols, flattenValue)
import Ledger.Address
import Ledger.Value
import CrossChain.Types

{-# INLINABLE mkValidator #-}
mkValidator :: CheckTokenInfo -> () -> () -> BuiltinData -> Bool
mkValidator (CheckTokenInfo checkTokenSymbol checkTokenName) _ _ rawContext =
    traceIfFalse "Missing treasury token input" hasTreasuryTokenInput
    where
        ctx :: StoremanScriptContext
        !ctx = PlutusTx.unsafeFromBuiltinData @StoremanScriptContext rawContext

        info :: TxInfo'
        !info = scriptContextTxInfo' ctx

        txInputs :: [TxInInfo']
        !txInputs = txInfoInputs' info

        totalValue :: Value
        !totalValue = foldMap (txOutValue' . txInInfoResolved') txInputs

        hasTreasuryTokenInput :: Bool
        !hasTreasuryTokenInput =
            let !amount = valueOf totalValue checkTokenSymbol checkTokenName
            in amount == 1

validator :: CheckTokenInfo -> Scripts.Validator
validator p = Plutus.mkValidatorScript $
        $$(PlutusTx.compile [|| validatorParam ||])
                `PlutusTx.applyCode`
                        PlutusTx.liftCode p
    where
        validatorParam s = mkUntypedValidator' (mkValidator s)

script :: CheckTokenInfo -> Plutus.Script
script = Plutus.unValidatorScript . validator

treasuryScript :: CheckTokenInfo -> PlutusScript PlutusScriptV2
treasuryScript p = PlutusScriptSerialised
    . SBS.toShort
    . LBS.toStrict
    $ serialise (script p)

treasuryScriptHash :: CheckTokenInfo -> Plutus.ValidatorHash
treasuryScriptHash = Scripts.validatorHash . validator

treasuryAddress :: CheckTokenInfo -> Ledger.Address
treasuryAddress = mkValidatorAddress . validator
