import React, { useState, useEffect } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { CounterAPI, type CounterState } from '@repo/counter-api/api-ui';
import { type CounterPrivateState } from '@midnight-ntwrk/counter-contract';

interface CounterProviderProps {
  contractAddress: ContractAddress;
  providers: any; // CounterProviders would be imported from counter-api
  children: React.ReactNode;
}

interface CounterContextType {
  counterState: CounterState | null;
  incrementCounter: () => Promise<void>;
  counterValue: bigint | null;
  isLoading: boolean;
  error: Error | null;
}

const CounterContext = React.createContext<CounterContextType>({
  counterState: null,
  incrementCounter: async () => {},
  counterValue: null,
  isLoading: false,
  error: null,
});

export const useCounter = () => {
  const context = React.useContext(CounterContext);
  if (context === undefined) {
    throw new Error('useCounter must be used within a CounterProvider');
  }
  return context;
};

export const CounterProvider: React.FC<CounterProviderProps> = ({ contractAddress, providers, children }) => {
  const [counterApi, setCounterApi] = useState<CounterAPI | null>(null);
  const [counterState, setCounterState] = useState<CounterState | null>(null);
  const [counterValue, setCounterValue] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initCounter = async () => {
      try {
        setIsLoading(true);
        // First check if the contract exists
        const exists = await CounterAPI.contractExists(providers, contractAddress);

        if (!exists) {
          throw new Error(`Contract at address ${contractAddress} does not exist`);
        }

        // Subscribe to the counter contract
        const api = await CounterAPI.subscribe(providers, contractAddress);

        setCounterApi(api);

        // Get initial counter value
        const value = await api.getCounterValue();
        setCounterValue(value);

        // Subscribe to state changes
        const subscription = api.state$.subscribe({
          next: (state: CounterState) => {
            setCounterState(state);
            setCounterValue(state.counterValue);
          },
          error: (err: Error) => {
            setError(err);
          },
        });

        setIsLoading(false);

        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        setIsLoading(false);
        setError(err instanceof Error ? err : new Error('Unknown error initializing counter'));
      }
    };

    initCounter();
  }, [contractAddress, providers]);

  const incrementCounter = async () => {
    if (!counterApi) {
      setError(new Error('Counter API not initialized'));
      return;
    }

    try {
      await counterApi.increment();
      // The state$ observable will update the UI
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to increment counter'));
    }
  };

  return (
    <CounterContext.Provider
      value={{
        counterState,
        incrementCounter,
        counterValue,
        isLoading,
        error,
      }}
    >
      {children}
    </CounterContext.Provider>
  );
};

export const CounterDisplay: React.FC = () => {
  const { counterValue, incrementCounter, isLoading, error } = useCounter();

  if (isLoading) {
    return <div>Loading counter...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="counter-container">
      <h2>Counter Contract</h2>
      <div className="counter-value">Current Value: {counterValue?.toString() || '0'}</div>
      <button className="increment-button" onClick={() => incrementCounter()} disabled={isLoading}>
        Increment Counter
      </button>
    </div>
  );
};

export const DeployCounterButton: React.FC<{
  providers: any;
  onDeployed: (contractAddress: ContractAddress) => void;
}> = ({ providers, onDeployed }) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [deploymentProgress, setDeploymentProgress] = useState<string>('');

  const deployCounter = async () => {
    try {
      setIsDeploying(true);
      setError(null);
      setDeploymentProgress('Preparing deployment...');

      // Validate that we have the necessary providers
      if (!providers || !providers.publicDataProvider || !providers.privateStateProvider) {
        throw new Error('Missing required providers for deployment');
      }

      setDeploymentProgress('Deploying counter contract...');

      // Use deploy function from api.ts with proper parameters
      const initialPrivateState: CounterPrivateState = { value: 0 };
      const deployedContract = await CounterAPI.deploy(providers, initialPrivateState);

      if (!deployedContract || !deployedContract.deployedContractAddress) {
        throw new Error('Deployment succeeded but failed to get contract address');
      }

      const contractAddress = deployedContract.deployedContractAddress;
      setDeploymentProgress('Deployment successful!');

      onDeployed(contractAddress);
      setIsDeploying(false);
      setDeploymentProgress('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deploy counter contract';
      setError(new Error(errorMessage));
      setIsDeploying(false);
      setDeploymentProgress('');
    }
  };

  return (
    <div className="deploy-counter-container">
      <button
        className="deploy-button"
        onClick={deployCounter}
        disabled={isDeploying}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: isDeploying ? '#cccccc' : '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isDeploying ? 'not-allowed' : 'pointer',
        }}
      >
        {isDeploying ? 'Deploying...' : 'Deploy New Counter Contract'}
      </button>

      {deploymentProgress && (
        <div
          className="deployment-progress"
          style={{
            marginTop: '8px',
            color: '#1976d2',
            fontWeight: 'bold',
          }}
        >
          {deploymentProgress}
        </div>
      )}

      {error && (
        <div
          className="error-message"
          style={{
            marginTop: '8px',
            color: '#d32f2f',
            padding: '8px',
            backgroundColor: '#ffebee',
            borderRadius: '4px',
            border: '1px solid #ffcdd2',
          }}
        >
          Error: {error.message}
        </div>
      )}
    </div>
  );
};

// CounterApplication component
export const CounterApplication: React.FC<{
  contractAddress?: ContractAddress;
  providers: any; // CounterProviders
}> = ({ contractAddress, providers }) => {
  const [deployedAddress, setDeployedAddress] = useState<ContractAddress | undefined>(contractAddress);

  if (!deployedAddress) {
    return <DeployCounterButton providers={providers} onDeployed={(address) => setDeployedAddress(address)} />;
  }

  return (
    <CounterProvider contractAddress={deployedAddress} providers={providers}>
      <CounterDisplay />
    </CounterProvider>
  );
};
