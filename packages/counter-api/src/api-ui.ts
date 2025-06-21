/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { Counter, witnesses, type CounterPrivateState } from '@midnight-ntwrk/counter-contract';
import { map, type Observable, retry } from 'rxjs';
import {
  type CounterContract,
  type CounterProviders,
  type DeployedCounterContract,
} from './common-types.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';

const counterContractInstance: CounterContract = new Counter.Contract(witnesses);

export interface DeployedCounterAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<CounterState>;
  readonly increment: () => Promise<void>;
  readonly getCounterValue: () => Promise<bigint>;
}

export interface CounterState {
  readonly counterValue: bigint;
}

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
    const deployedContract = await deployContract(providers, {
      contract: counterContractInstance,
      privateStateId: 'counterPrivateState',
      initialPrivateState: privateState,
    });
    console.log(`Deployed contract at address: ${deployedContract.deployTxData.public.contractAddress}`);
    return new CounterAPI(deployedContract as unknown as DeployedCounterContract, providers);
  }

  static async subscribe(
    providers: CounterProviders,
    contractAddress: ContractAddress,
  ): Promise<CounterAPI> {
    console.log(`Subscribing to counter contract at ${contractAddress}...`);
    try {
      const deployedContract = await findDeployedContract(providers, {
        contractAddress,
        contract: counterContractInstance,
        privateStateId: 'counterPrivateState',
        initialPrivateState: { value: 0 },
      });
      console.log('Successfully subscribed to contract');
      return new CounterAPI(deployedContract as unknown as DeployedCounterContract, providers);
    } catch (error) {
      console.error('Error subscribing to contract:', error);
      // If there's a verifier key mismatch, it might be because the contract was deployed with different parameters
      // Try to provide a more helpful error message
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

// Add browser-compatible exports from api.ts for use in the UI/web app
export { Counter, witnesses } from '@midnight-ntwrk/counter-contract';
export type { CounterContract, CounterProviders, DeployedCounterContract } from './common-types.js';
export { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';