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

// Unified API interfaces
export interface DeployedCounterAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<CounterState>;
  readonly increment: () => Promise<void>;
  readonly getCounterValue: () => Promise<bigint>;
}

export interface CounterState {
  readonly counterValue: bigint;
}

// API Operation Options
export interface DeployOptions {
  /** Return type: 'api' for UI (CounterAPI instance), 'contract' for CLI (DeployedCounterContract) */
  returnType?: 'api' | 'contract';
}

export interface IncrementOptions {
  /** Return type: 'void' for UI, 'transaction' for CLI (transaction data) */
  returnType?: 'void' | 'transaction';
}

// Transaction response type for CLI operations
export interface TransactionResponse {
  readonly txId?: string;
  readonly txHash?: string;
  readonly blockHeight?: bigint | number;
}

// Main CounterAPI class - Professional unified interface
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

  // ========================================
  // UNIFIED STATIC METHODS (UI + CLI)
  // ========================================

  /**
   * Deploy a new counter contract
   * @param providers - The providers configuration
   * @param privateState - Initial private state for the contract
   * @param options - Deployment options to control return type
   * @returns CounterAPI instance (UI) or DeployedCounterContract (CLI) based on options
   */
  static async deploy(
    providers: CounterProviders,
    privateState: CounterPrivateState,
    options: DeployOptions & { returnType: 'contract' }
  ): Promise<DeployedCounterContract>;
  static async deploy(
    providers: CounterProviders,
    privateState: CounterPrivateState,
    options?: DeployOptions & { returnType?: 'api' }
  ): Promise<CounterAPI>;
  static async deploy(
    providers: CounterProviders,
    privateState: CounterPrivateState,
    options: DeployOptions = {}
  ): Promise<CounterAPI | DeployedCounterContract> {
    console.log('Deploying counter contract...');
    
    try {
      // Validate providers
      CounterAPI.validateProviders(providers);
      
      console.log('Calling deployContract with shared contract instance...');
      const deployedContract = await deployContract(providers as any, {
        contract: counterContractInstance,
        privateStateId: 'counterPrivateState',
        initialPrivateState: privateState,
      });
      
      console.log(`Deployed contract at address: ${deployedContract.deployTxData.public.contractAddress}`);
      
      const typedContract = deployedContract as unknown as DeployedCounterContract;
      
      // Return based on requested type
      if (options.returnType === 'contract') {
        return typedContract;
      } else {
        return new CounterAPI(typedContract, providers);
      }
      
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

  /**
   * Connect to an existing counter contract
   * @param providers - The providers configuration
   * @param contractAddress - Address of the existing contract
   * @param options - Connection options to control return type
   * @returns CounterAPI instance (UI) or DeployedCounterContract (CLI) based on options
   */
  static async connect(
    providers: CounterProviders,
    contractAddress: ContractAddress | string,
    options: DeployOptions & { returnType: 'contract' }
  ): Promise<DeployedCounterContract>;
  static async connect(
    providers: CounterProviders,
    contractAddress: ContractAddress | string,
    options?: DeployOptions & { returnType?: 'api' }
  ): Promise<CounterAPI>;
  static async connect(
    providers: CounterProviders,
    contractAddress: ContractAddress | string,
    options: DeployOptions = {}
  ): Promise<CounterAPI | DeployedCounterContract> {
    console.log(`Connecting to counter contract at ${contractAddress}...`);
    try {
      const deployedContract = await findDeployedContract(providers as any, {
        contractAddress,
        contract: counterContractInstance,
        privateStateId: 'counterPrivateState',
        initialPrivateState: { value: 0 },
      });
      
      console.log('Successfully connected to contract');
      const typedContract = deployedContract as unknown as DeployedCounterContract;
      
      // Return based on requested type
      if (options.returnType === 'contract') {
        return typedContract;
      } else {
        return new CounterAPI(typedContract, providers);
      }
    } catch (error) {
      console.error('Error connecting to contract:', error);
      
      if (error instanceof Error && error.message.includes('verifier key')) {
        throw new Error(`Unable to connect to contract at ${contractAddress}. This contract may have been deployed with different circuit parameters or is not a compatible counter contract. Original error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Increment the counter
   * @param contract - The deployed contract instance
   * @param options - Increment options to control return type
   * @returns void (UI) or transaction data (CLI) based on options
   */
  static async increment(
    contract: DeployedCounterContract,
    options: IncrementOptions & { returnType: 'transaction' }
  ): Promise<TransactionResponse>;
  static async increment(
    contract: DeployedCounterContract,
    options?: IncrementOptions & { returnType?: 'void' }
  ): Promise<void>;
  static async increment(
    contract: DeployedCounterContract,
    options: IncrementOptions = {}
  ): Promise<void | TransactionResponse> {
    console.log('Incrementing...');
    const finalizedTxData = await contract.callTx.increment();
    
    // Extract transaction information defensively
    let txInfo: TransactionResponse = {};
    
    if (finalizedTxData && typeof finalizedTxData === 'object') {
      if ('public' in finalizedTxData && finalizedTxData.public) {
        const pub = finalizedTxData.public;
        txInfo = {
          txId: pub.txId,
          txHash: pub.txHash,
          blockHeight: pub.blockHeight,
        };
        console.log(`Transaction ${txInfo.txId ?? txInfo.txHash ?? 'unknown'} added in block ${txInfo.blockHeight ?? 'unknown'}`);
      } else {
        // Handle direct transaction data
        const data = finalizedTxData as any;
        txInfo = {
          txId: data.txId,
          txHash: data.txHash,
          blockHeight: data.blockHeight,
        };
        console.log(`Transaction ${txInfo.txId ?? txInfo.txHash ?? 'unknown'} added in block ${txInfo.blockHeight ?? 'unknown'}`);
      }
    } else {
      console.log('Transaction finalized:', finalizedTxData);
    }

    // Return based on requested type
    if (options.returnType === 'transaction') {
      return txInfo;
    }
    // Default: return void for UI
  }

  /**
   * Get current counter value and contract information
   * @param providers - The providers configuration
   * @param contract - The deployed contract instance
   * @returns Object with counter value and contract address
   */
  static async getCounterInfo(
    providers: CounterProviders,
    contract: DeployedCounterContract,
  ): Promise<{ counterValue: bigint | null; contractAddress: string }> {
    const contractAddress = contract.deployTxData.public.contractAddress;
    const counterValue = await CounterAPI.getCounterState(providers, contractAddress);
    if (counterValue === null) {
      console.log(`There is no counter contract deployed at ${contractAddress}.`);
    } else {
      console.log(`Current counter value: ${Number(counterValue)}`);
    }
    return { contractAddress, counterValue };
  }

  /**
   * Get the counter state (value) from a contract address
   * @param providers - The providers configuration
   * @param contractAddress - The contract address to query
   * @returns The counter value or null if not found
   */
  static async getCounterState(
    providers: CounterProviders,
    contractAddress: ContractAddress,
  ): Promise<bigint | null> {
    assertIsContractAddress(contractAddress);
    console.log('Checking contract state...');
    const state = await providers.publicDataProvider
      .queryContractState(contractAddress)
      .then((contractState) => (contractState != null ? Counter.ledger(contractState.data).round : null));
    console.log(`Counter state: ${state}`);
    return state;
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

  // ========================================
  // UTILITY METHODS
  // ========================================

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Validate that all required providers are present
   */
  private static validateProviders(providers: CounterProviders): void {
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
  }
}

// Exports for compatibility
export { Counter, witnesses } from '@midnight-ntwrk/counter-contract';
export type { CounterContract, CounterProviders, DeployedCounterContract } from './common-types.js';
export { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';

// Re-export currentDir from config for compatibility
export { currentDir } from './config.js';

export function setLogger(_logger: any) {
  // Logger functionality replaced with console.log
}

// Note: Node.js specific functions (buildWalletAndWaitForFunds, buildFreshWallet, etc.) 
// are available in './node-api' for CLI compatibility, but are not exported here
// to maintain browser compatibility
