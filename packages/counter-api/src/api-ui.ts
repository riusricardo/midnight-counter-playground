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
    console.log('=== DEPLOYMENT DEBUG START ===');
    console.log('Deploying counter contract...');
    
    try {
      console.log('Step 1: Checking providers parameter...');
      console.log('typeof providers:', typeof providers);
      console.log('providers null check:', providers === null);
      console.log('providers undefined check:', providers === undefined);
      
      if (!providers) {
        console.error('❌ Providers is null/undefined');
        throw new Error('CounterProviders is required for deployment');
      }
      
      console.log('Step 2: Examining providers structure...');
      console.log('providers keys:', Object.keys(providers || {}));
      
      console.log('Step 3: Checking individual providers...');
      console.log('publicDataProvider exists:', !!providers.publicDataProvider);
      console.log('privateStateProvider exists:', !!providers.privateStateProvider);
      console.log('walletProvider exists:', !!providers.walletProvider);
      console.log('proofProvider exists:', !!providers.proofProvider);
      console.log('zkConfigProvider exists:', !!providers.zkConfigProvider);
      console.log('midnightProvider exists:', !!providers.midnightProvider);
      
      if (!providers.publicDataProvider) {
        console.error('❌ Missing publicDataProvider');
        throw new Error('PublicDataProvider is required for deployment');
      }
      
      if (!providers.privateStateProvider) {
        console.error('❌ Missing privateStateProvider');
        throw new Error('PrivateStateProvider is required for deployment');
      }
      
      if (!providers.walletProvider) {
        console.error('❌ Missing walletProvider');
        throw new Error('WalletProvider is required for deployment');
      }
      
      console.log('Step 4: Checking contract instance...');
      console.log('counterContractInstance exists:', !!counterContractInstance);
      console.log('counterContractInstance type:', typeof counterContractInstance);
      
      if (!counterContractInstance) {
        console.error('❌ counterContractInstance is null/undefined');
        throw new Error('Counter contract instance is not properly initialized');
      }
      
      console.log('Step 5: Checking witnesses...');
      console.log('witnesses:', witnesses);
      console.log('witnesses type:', typeof witnesses);
      
      console.log('Step 6: Checking private state...');
      console.log('privateState:', privateState);
      console.log('privateState type:', typeof privateState);
      
      console.log('Step 6b: Checking contract instance properties...');
      try {
        console.log('counterContractInstance keys:', Object.keys(counterContractInstance || {}));
        if (counterContractInstance && 'circuit' in counterContractInstance) {
          console.log('Contract has circuit property');
          const circuit = (counterContractInstance as any).circuit;
          if (circuit) {
            console.log('Circuit keys:', Object.keys(circuit));
            if ('verifierKey' in circuit) {
              console.log('Circuit has verifierKey');
              const vk = circuit.verifierKey;
              if (vk && typeof vk === 'object') {
                console.log('VerifierKey type:', typeof vk);
                console.log('VerifierKey constructor:', vk.constructor?.name);
                if ('version' in vk) {
                  console.log('VerifierKey version:', vk.version);
                }
              }
            }
          }
        }
      } catch (e) {
        console.log('Error inspecting contract instance:', e);
      }
      
      console.log('Step 7: About to call deployContract...');
      console.log('Deployment parameters:', {
        contract: 'counterContractInstance',
        privateStateId: 'counterPrivateState',
        initialPrivateState: privateState,
      });
      
      // Check providers one more time right before deployment
      console.log('Pre-deployment provider validation:');
      for (const [key, provider] of Object.entries(providers)) {
        console.log(`  ${key}:`, !!provider, typeof provider);
        if (provider && typeof provider === 'object') {
          console.log(`    ${key} constructor:`, provider.constructor.name);
          // Try to check if this provider has version information
          if ('version' in provider) {
            console.log(`    ${key} version:`, (provider as any).version);
          }
          if ('getVersion' in provider && typeof (provider as any).getVersion === 'function') {
            try {
              const version = await (provider as any).getVersion();
              console.log(`    ${key} version (from getVersion()):`, version);
            } catch (e) {
              console.log(`    ${key} getVersion() failed:`, e);
            }
          }
        }
      }
      
      console.log('Step 7b: Calling deployContract now...');
      const deployedContract = await deployContract(providers, {
        contract: counterContractInstance,
        privateStateId: 'counterPrivateState',
        initialPrivateState: privateState,
      });
      
      console.log('Step 8: deployContract completed successfully');
      console.log(`Deployed contract at address: ${deployedContract.deployTxData.public.contractAddress}`);
      console.log('=== DEPLOYMENT DEBUG END ===');
      return new CounterAPI(deployedContract as unknown as DeployedCounterContract, providers);
      
    } catch (error) {
      console.error('=== DEPLOYMENT ERROR DEBUG ===');
      console.error('Error caught at top level of deploy function');
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error instanceof Error:', error instanceof Error);
      
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      } else {
        console.error('Non-Error object thrown:', error);
      }
      
      console.error('=== DEPLOYMENT ERROR DEBUG END ===');
      
      // Re-throw with enhanced message
      if (error instanceof Error && error.message.includes('VerifierKey')) {
        throw new Error(`Contract deployment failed due to verifier key compatibility issue. This may be due to version mismatch between the contract and runtime environment. Please ensure your client and network are using compatible versions. Original error: ${error.message}`);
      }
      
      if (error instanceof Error && error.message.includes('Unsupported version')) {
        throw new Error(`Contract deployment failed due to version incompatibility. The contract runtime version does not match the client version. Please check that you're using compatible versions of the Midnight SDK. Original error: ${error.message}`);
      }
      
      if (error instanceof Error && (error.message.includes('network') || error.message.includes('connection'))) {
        throw new Error(`Contract deployment failed due to network connectivity issues. Please check your connection and try again. Original error: ${error.message}`);
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