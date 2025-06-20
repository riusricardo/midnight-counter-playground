import React, { useState, useEffect } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { CounterAPI, type CounterState } from '@repo/counter-api';
import { type Logger } from 'pino';

interface CounterProviderProps {
  contractAddress: ContractAddress;
  providers: any; // CounterProviders would be imported from counter-api
  logger: Logger;
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

export const CounterProvider: React.FC<CounterProviderProps> = ({ contractAddress, providers, logger, children }) => {
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
        const api = await CounterAPI.subscribe(providers, contractAddress, logger);

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
            logger.error('Error in counter state subscription:', err);
          },
        });

        setIsLoading(false);

        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        setIsLoading(false);
        setError(err instanceof Error ? err : new Error('Unknown error initializing counter'));
        logger.error('Failed to initialize counter:', err);
      }
    };

    initCounter();
  }, [contractAddress, providers, logger]);

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
      logger.error('Error incrementing counter:', err);
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
  providers: any; // CounterProviders
  logger: Logger;
  onDeployed: (contractAddress: ContractAddress) => void;
}> = ({ providers, logger, onDeployed }) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deployCounter = async () => {
    try {
      setIsDeploying(true);
      setError(null);

      const counterApi = await CounterAPI.deploy(providers, logger);

      onDeployed(counterApi.deployedContractAddress);
      setIsDeploying(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to deploy counter contract'));
      logger.error('Error deploying counter contract:', err);
      setIsDeploying(false);
    }
  };

  return (
    <div className="deploy-counter-container">
      <button className="deploy-button" onClick={deployCounter} disabled={isDeploying}>
        {isDeploying ? 'Deploying...' : 'Deploy New Counter Contract'}
      </button>
      {error && <div className="error-message">Error: {error.message}</div>}
    </div>
  );
};

// CounterApplication component
export const CounterApplication: React.FC<{
  contractAddress?: ContractAddress;
  providers: any; // CounterProviders
  logger: Logger;
}> = ({ contractAddress, providers, logger }) => {
  const [deployedAddress, setDeployedAddress] = useState<ContractAddress | undefined>(contractAddress);
  
  if (!deployedAddress) {
    return (
      <DeployCounterButton 
        providers={providers}
        logger={logger}
        onDeployed={(address) => setDeployedAddress(address)}
      />
    );
  }
  
  return (
    <CounterProvider 
      contractAddress={deployedAddress} 
      providers={providers}
      logger={logger}
    >
      <CounterDisplay />
    </CounterProvider>
  );
};
