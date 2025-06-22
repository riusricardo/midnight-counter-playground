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
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import {
  type FinalizedTxData,
} from '@midnight-ntwrk/midnight-js-types';

import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { map, type Observable, retry } from 'rxjs';
import {
  type CounterContract,
  type CounterProviders,
  type DeployedCounterContract,
} from './common-types.js';

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

  // --- Legacy/CLI-compatible static methods ---

  /**
   * Legacy: Get the counter ledger state (returns bigint|null)
   */
  static async getCounterLedgerState(
    providers: CounterProviders,
    contractAddress: ContractAddress,
  ): Promise<bigint | null> {
    assertIsContractAddress(contractAddress);
    console.log('Checking contract ledger state...');
    const state = await providers.publicDataProvider
      .queryContractState(contractAddress)
      .then((contractState) => (contractState != null ? Counter.ledger(contractState.data).round : null));
    console.log(`Ledger state: ${state}`);
    return state;
  }

  /**
   * Legacy: Join a contract (returns DeployedCounterContract)
   */
  static async joinContract(providers: CounterProviders, contractAddress: string): Promise<DeployedCounterContract> {
    const counterContract = await findDeployedContract(providers as any, {
      contractAddress,
      contract: counterContractInstance,
      privateStateId: 'counterPrivateState',
      initialPrivateState: { value: 0 },
    });
    console.log(`Joined contract at address: ${counterContract.deployTxData.public.contractAddress}`);
    return counterContract as DeployedCounterContract;
  }

  /**
   * Legacy: Deploy contract (returns DeployedCounterContract)
   */
  static async deployLegacy(
    providers: CounterProviders,
    privateState: CounterPrivateState,
  ): Promise<DeployedCounterContract> {
    console.log('Deploying counter contract...');
    const counterContract = await deployContract(providers as any, {
      contract: counterContractInstance,
      privateStateId: 'counterPrivateState',
      initialPrivateState: privateState,
    });
    console.log(`Deployed contract at address: ${counterContract.deployTxData.public.contractAddress}`);
    return counterContract as DeployedCounterContract;
  }

  /**
   * Legacy: Increment (returns FinalizedTxData)
   */
  static async incrementLegacy(counterContract: DeployedCounterContract): Promise<any> {
    console.log('Incrementing...');
    const finalizedTxData = await counterContract.callTx.increment();
    // Defensive logging for both possible return shapes
    if (finalizedTxData && typeof finalizedTxData === 'object') {
      if ('public' in finalizedTxData && finalizedTxData.public) {
        const pub = finalizedTxData.public;
        console.log(`Transaction ${pub.txId ?? pub.txHash ?? 'unknown'} added in block ${pub.blockHeight ?? 'unknown'}`);
        return pub;
      } else if ('txId' in (finalizedTxData as any) || 'txHash' in (finalizedTxData as any)) {
        const txId = (finalizedTxData as any).txId ?? (finalizedTxData as any).txHash ?? 'unknown';
        const blockHeight = (finalizedTxData as any).blockHeight ?? 'unknown';
        console.log(`Transaction ${txId} added in block ${blockHeight}`);
        return finalizedTxData;
      }
    }
    console.log('Transaction finalized:', finalizedTxData);
    return finalizedTxData;
  }

  /**
   * Legacy: Display counter value (returns { counterValue, contractAddress })
   */
  static async displayCounterValue(
    providers: CounterProviders,
    counterContract: DeployedCounterContract,
  ): Promise<{ counterValue: bigint | null; contractAddress: string }> {
    const contractAddress = counterContract.deployTxData.public.contractAddress;
    const counterValue = await CounterAPI.getCounterLedgerState(providers, contractAddress);
    if (counterValue === null) {
      console.log(`There is no counter contract deployed at ${contractAddress}.`);
    } else {
      console.log(`Current counter value: ${Number(counterValue)}`);
    }
    return { contractAddress, counterValue };
  }
}

// Exports for compatibility
export { Counter, witnesses } from '@midnight-ntwrk/counter-contract';
export type { CounterContract, CounterProviders, DeployedCounterContract } from './common-types.js';
export { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';

// Legacy API exports for compatibility with CLI and tests
export const deployLegacy = CounterAPI.deployLegacy;
export const joinContract = CounterAPI.joinContract;
export const incrementLegacy = CounterAPI.incrementLegacy;
export const displayCounterValue = CounterAPI.displayCounterValue;
export const getCounterLedgerState = CounterAPI.getCounterLedgerState;

// Re-export currentDir from config for compatibility
export { currentDir } from './config.js';

export function setLogger(_logger: any) {
  // Logger functionality replaced with console.log
}

// Note: Node.js specific functions (buildWalletAndWaitForFunds, buildFreshWallet, etc.) 
// are available in './node-api' for CLI compatibility, but are not exported here
// to maintain browser compatibility
