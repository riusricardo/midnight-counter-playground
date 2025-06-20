/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { Counter, witnesses, type CounterPrivateState } from '@midnight-ntwrk/counter-contract';
import { type Logger } from 'pino';
import { map, type Observable, retry } from 'rxjs';
import {
  type CounterContract,
  type CounterProviders,
  type DeployedCounterContract,
} from './common-types.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';

const counterContract: CounterContract = new Counter.Contract(witnesses);

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
    public readonly providers: CounterProviders,
    private readonly logger: Logger,
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
    this.logger.info('Incrementing counter...');
    const finalizedTxData = await this.deployedContract.callTx.increment();
    this.logger.info(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  }

  async getCounterValue(): Promise<bigint> {
    this.logger.info('Getting counter value...');
    const state = await this.providers.publicDataProvider.queryContractState(this.deployedContractAddress);
    if (state === null) {
      return BigInt(0);
    }
    return Counter.ledger(state.data).round;
  }

  static async deploy(
    providers: CounterProviders,
    logger: Logger,
  ): Promise<CounterAPI> {
    logger.info('Deploying counter contract...');
    const deployedContract = await deployContract(providers, {
      contract: counterContract,
      privateStateId: 'counterPrivateState',
      initialPrivateState: { value: 0 },
    });
    logger.info(`Deployed contract at address: ${deployedContract.deployTxData.public.contractAddress}`);
    return new CounterAPI(deployedContract as unknown as DeployedCounterContract, providers, logger);
  }

  static async subscribe(
    providers: CounterProviders,
    contractAddress: ContractAddress,
    logger: Logger,
  ): Promise<CounterAPI> {
    logger.info(`Subscribing to counter contract at ${contractAddress}...`);
    const deployedContract = await findDeployedContract(providers, {
      contractAddress,
      contract: counterContract,
      privateStateId: 'counterPrivateState',
      initialPrivateState: { value: 0 },
    });
    logger.info('Successfully subscribed to contract');
    return new CounterAPI(deployedContract as unknown as DeployedCounterContract, providers, logger);
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
}

// Add browser-compatible exports from api.ts for use in the UI/web app
export { Counter, witnesses } from '@midnight-ntwrk/counter-contract';
export type { CounterContract, CounterProviders, DeployedCounterContract } from './common-types.js';
export { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';