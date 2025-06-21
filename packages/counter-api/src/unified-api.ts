// This file is part of midnightntwrk/example-counter.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { Counter, type CounterPrivateState, witnesses } from '@midnight-ntwrk/counter-contract';
import { type CoinInfo, nativeToken, Transaction, type TransactionId } from '@midnight-ntwrk/ledger';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import {
  type BalancedTransaction,
  createBalancedTx,
  type FinalizedTxData,
  type MidnightProvider,
  type UnbalancedTransaction,
  type WalletProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { Transaction as ZswapTransaction } from '@midnight-ntwrk/zswap';

// Browser-compatible private state provider inline implementation
const createBrowserPrivateStateProvider = <T extends string = string>(config: { privateStateStoreName: string }) => {
  const storage = new Map<string, unknown>();
  const signingKeys = new Map<string, any>();
  
  const getStorageKey = (key: T): string => `${config.privateStateStoreName}:${key}`;
  const getSigningKeyStorageKey = (key: T): string => `${config.privateStateStoreName}:signingKey:${key}`;

  return {
    async get(key: T): Promise<unknown | null> {
      return storage.get(getStorageKey(key)) ?? null;
    },
    async set(key: T, state: unknown): Promise<void> {
      storage.set(getStorageKey(key), state);
    },
    async remove(key: T): Promise<void> {
      storage.delete(getStorageKey(key));
    },
    async clear(): Promise<void> {
      storage.clear();
    },
    async setSigningKey(key: T, signingKey: any): Promise<void> {
      signingKeys.set(getSigningKeyStorageKey(key), signingKey);
    },
    async getSigningKey(key: T): Promise<any | null> {
      return signingKeys.get(getSigningKeyStorageKey(key)) ?? null;
    },
    async removeSigningKey(key: T): Promise<void> {
      signingKeys.delete(getSigningKeyStorageKey(key));
    },
    async clearSigningKeys(): Promise<void> {
      signingKeys.clear();
    },
  };
};

import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { getLedgerNetworkId, getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { map, type Observable, retry } from 'rxjs';
import {
  type CounterContract,
  type CounterPrivateStateId,
  type CounterProviders,
  type DeployedCounterContract,
} from './common-types.js';
import { type Config, contractConfig } from './config.js';
import * as Rx from 'rxjs';

// Single shared contract instance to ensure consistency
const counterContractInstance: CounterContract = new Counter.Contract(witnesses);

// React-compatible API interfaces
export interface DeployedCounterAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<CounterState>;
  readonly increment: () => Promise<void>;
  readonly getCounterValue: () => Promise<bigint>;
}

export interface CounterState {
  readonly counterValue: bigint;
}

// Main CounterAPI class for React applications
export class CounterAPI implements DeployedCounterAPI {
  private constructor(
    public readonly deployedContract: DeployedCounterContract,
    public readonly providers: CounterProviders
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    this.state$ = this.providers.publicDataProvider
      .contractStateObservable(this.deployedContractAddress, { type: 'all' })
      .pipe(
        map((contractState) => Counter.ledger(contractState.data)),
        map((ledgerState) => ({
          counterValue: ledgerState.round
        })),
        retry({
          delay: 500, // retry websocket connection if it fails
        })
      );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<CounterState>;

  async increment(): Promise<void> {
    console.log('Incrementing counter...');
    const finalizedTxData = await this.deployedContract.callTx.increment();
    console.log(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  }

  async getCounterValue(): Promise<bigint> {
    console.log('Getting counter value...');
    const state = await this.providers.publicDataProvider.queryContractState(this.deployedContractAddress);
    if (state === null) {
      return BigInt(0);
    }
    return Counter.ledger(state.data).round;
  }

  static async deploy(
    providers: CounterProviders,
    privateState: CounterPrivateState,
  ): Promise<CounterAPI> {
    console.log('Deploying counter contract...');
    
    try {
      // Validate providers
      if (!providers) {
        throw new Error('CounterProviders is required for deployment');
      }
      
      if (!providers.publicDataProvider) {
        throw new Error('PublicDataProvider is required for deployment');
      }
      
      if (!providers.privateStateProvider) {
        throw new Error('PrivateStateProvider is required for deployment');
      }
      
      if (!providers.walletProvider) {
        throw new Error('WalletProvider is required for deployment');
      }

      if (!providers.zkConfigProvider) {
        throw new Error('ZKConfigProvider is required for deployment');
      }

      if (!providers.proofProvider) {
        throw new Error('ProofProvider is required for deployment');
      }

      if (!providers.midnightProvider) {
        throw new Error('MidnightProvider is required for deployment');
      }
      
      console.log('Calling deployContract with shared contract instance...');
      const deployedContract = await deployContract(providers as any, {
        contract: counterContractInstance,
        privateStateId: 'counterPrivateState',
        initialPrivateState: privateState,
      });
      
      console.log(`Deployed contract at address: ${deployedContract.deployTxData.public.contractAddress}`);
      return new CounterAPI(deployedContract as unknown as DeployedCounterContract, providers);
      
    } catch (error) {
      console.error('Contract deployment failed:', error);
      
      if (error instanceof Error && error.message.includes('verifier key')) {
        throw new Error(`Contract deployment failed due to verifier key compatibility issue. This may be due to version mismatch between the contract and runtime environment. Please ensure your client and network are using compatible versions. Original error: ${error.message}`);
      }
      
      if (error instanceof Error && error.message.includes('Unsupported version')) {
        throw new Error(`Contract deployment failed due to version incompatibility. The contract runtime version does not match the client version. Please check that you're using compatible versions of the Midnight SDK. Original error: ${error.message}`);
      }
      
      throw error;
    }
  }

  static async subscribe(
    providers: CounterProviders,
    contractAddress: ContractAddress,
  ): Promise<CounterAPI> {
    console.log(`Subscribing to counter contract at ${contractAddress}...`);
    try {
      const deployedContract = await findDeployedContract(providers as any, {
        contractAddress,
        contract: counterContractInstance, // Use the same shared instance
        privateStateId: 'counterPrivateState',
        initialPrivateState: { value: 0 },
      });
      console.log('Successfully subscribed to contract');
      return new CounterAPI(deployedContract as unknown as DeployedCounterContract, providers);
    } catch (error) {
      console.error('Error subscribing to contract:', error);
      
      if (error instanceof Error && error.message.includes('verifier key')) {
        throw new Error(`Unable to connect to contract at ${contractAddress}. This contract may have been deployed with different circuit parameters or is not a compatible counter contract. Original error: ${error.message}`);
      }
      throw error;
    }
  }

  static async contractExists(providers: CounterProviders, contractAddress: ContractAddress): Promise<boolean> {
    try {
      const state = await providers.publicDataProvider.queryContractState(contractAddress);
      if (state === null) {
        return false;
      }
      void Counter.ledger(state.data); // try to parse it
      return true;
    } catch (e) {
      return false;
    }
  }

  static async getCounterValueDirect(providers: CounterProviders, contractAddress: ContractAddress): Promise<bigint> {
    try {
      const state = await providers.publicDataProvider.queryContractState(contractAddress);
      if (state === null) {
        throw new Error('Contract state not found');
      }
      return Counter.ledger(state.data).round;
    } catch (error) {
      console.error('Error reading counter value directly:', error);
      throw new Error(`Unable to read counter value from contract at ${contractAddress}. The contract may not be a valid counter contract or may be incompatible.`);
    }
  }
}

// Browser-compatible random bytes function
export const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  
  // Use globalThis.crypto for browser compatibility or webcrypto for Node.js
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else if (typeof require !== 'undefined') {
    // Node.js environment
    const { webcrypto } = require('crypto');
    webcrypto.getRandomValues(bytes);
  } else {
    throw new Error('No secure random source available');
  }
  
  return bytes;
};

// Browser-compatible createWalletAndMidnightProvider (only for typing, real implementation in Node.js)
export const createWalletAndMidnightProvider = async (wallet: any): Promise<WalletProvider & MidnightProvider> => {
  const state = await Rx.firstValueFrom(wallet.state());
  return {
    coinPublicKey: (state as any).coinPublicKey,
    encryptionPublicKey: (state as any).encryptionPublicKey,
    balanceTx(tx: UnbalancedTransaction, newCoins: CoinInfo[]): Promise<BalancedTransaction> {
      return wallet
        .balanceTransaction(ZswapTransaction.deserialize(tx.serialize(getLedgerNetworkId()), getZswapNetworkId()), newCoins)
        .then((tx: any) => wallet.proveTransaction(tx))
        .then((zswapTx: any) => Transaction.deserialize(zswapTx.serialize(getZswapNetworkId()), getLedgerNetworkId()))
        .then(createBalancedTx);
    },
    submitTx(tx: BalancedTransaction): Promise<TransactionId> {
      return wallet.submitTransaction(tx);
    },
  };
};

export const configureProviders = async (
  wallet: any, // Wallet & Resource,
  config: Config,
  zkConfigProvider: any // Should be ZKConfigProvider<'increment'>, but kept as any for flexibility
): Promise<CounterProviders> => {
  const walletAndMidnightProvider = await createWalletAndMidnightProvider(wallet);
  return {
    privateStateProvider: createBrowserPrivateStateProvider<typeof CounterPrivateStateId>({
      privateStateStoreName: contractConfig.privateStateStoreName,
    }) as any,  // Type assertion to bypass strict typing
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider: zkConfigProvider as any, // injected
    proofProvider: httpClientProofProvider(config.proofServer) as any,
    walletProvider: walletAndMidnightProvider as any,
    midnightProvider: walletAndMidnightProvider as any,
  } as CounterProviders;
};

// Legacy API functions for compatibility with existing Node.js code
export const getCounterLedgerState = async (
  providers: CounterProviders,
  contractAddress: ContractAddress,
): Promise<bigint | null> => {
  assertIsContractAddress(contractAddress);
  console.log('Checking contract ledger state...');
  const state = await providers.publicDataProvider
    .queryContractState(contractAddress)
    .then((contractState) => (contractState != null ? Counter.ledger(contractState.data).round : null));
  console.log(`Ledger state: ${state}`);
  return state;
};

export const joinContract = async (providers: CounterProviders, contractAddress: string): Promise<DeployedCounterContract> => {
  const counterContract = await findDeployedContract(providers as any, {
    contractAddress,
    contract: counterContractInstance,
    privateStateId: 'counterPrivateState',
    initialPrivateState: { value: 0 },
  });
  console.log(`Joined contract at address: ${counterContract.deployTxData.public.contractAddress}`);
  return counterContract as DeployedCounterContract;
};

export const deploy = async (
  providers: CounterProviders,
  privateState: CounterPrivateState,
): Promise<DeployedCounterContract> => {
  console.log('Deploying counter contract...');
  const counterContract = await deployContract(providers as any, {
    contract: counterContractInstance,
    privateStateId: 'counterPrivateState',
    initialPrivateState: privateState,
  });
  console.log(`Deployed contract at address: ${counterContract.deployTxData.public.contractAddress}`);
  return counterContract as DeployedCounterContract;
};

export const increment = async (counterContract: DeployedCounterContract): Promise<FinalizedTxData> => {
  console.log('Incrementing...');
  const finalizedTxData = await counterContract.callTx.increment();
  console.log(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  return finalizedTxData.public;
};

export const displayCounterValue = async (
  providers: CounterProviders,
  counterContract: DeployedCounterContract,
): Promise<{ counterValue: bigint | null; contractAddress: string }> => {
  const contractAddress = counterContract.deployTxData.public.contractAddress;
  const counterValue = await getCounterLedgerState(providers, contractAddress);
  if (counterValue === null) {
    console.log(`There is no counter contract deployed at ${contractAddress}.`);
  } else {
    console.log(`Current counter value: ${Number(counterValue)}`);
  }
  return { contractAddress, counterValue };
};

// Exports for compatibility
export { Counter, witnesses } from '@midnight-ntwrk/counter-contract';
export type { CounterContract, CounterProviders, DeployedCounterContract } from './common-types.js';
export { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';

export function setLogger(_logger: any) {
  // Logger functionality replaced with console.log
}

// Note: Node.js specific functions (buildWalletAndWaitForFunds, buildFreshWallet, etc.) 
// are available in './node-api' for CLI compatibility, but are not exported here
// to maintain browser compatibility
