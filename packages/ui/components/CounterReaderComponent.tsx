import React, { useState, useEffect } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { CounterAPI, type CounterState, type CounterProviders } from '@repo/counter-api/api-ui';

interface CounterReaderProviderProps {
  contractAddress: ContractAddress;
  providers: CounterProviders;
  children: React.ReactNode;
}

interface CounterReaderContextType {
  counterState: CounterState | null;
  counterValue: bigint | null;
  isLoading: boolean;
  error: Error | null;
  contractExists: boolean;
  refreshValue: () => Promise<void>;
  hasRealtimeUpdates: boolean;
}

const CounterReaderContext = React.createContext<CounterReaderContextType>({
  counterState: null,
  counterValue: null,
  isLoading: false,
  error: null,
  contractExists: false,
  refreshValue: async () => {},
  hasRealtimeUpdates: false,
});

export const useCounterReader = () => {
  const context = React.useContext(CounterReaderContext);
  if (context === undefined) {
    throw new Error('useCounterReader must be used within a CounterReaderProvider');
  }
  return context;
};

export const CounterReaderProvider: React.FC<CounterReaderProviderProps> = ({ contractAddress, providers, children }) => {
  const [counterApi, setCounterApi] = useState<CounterAPI | null>(null);
  const [counterState, setCounterState] = useState<CounterState | null>(null);
  const [counterValue, setCounterValue] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [contractExists, setContractExists] = useState<boolean>(false);
  const [hasRealtimeUpdates, setHasRealtimeUpdates] = useState<boolean>(false);

  // Wrapper function to safely call getCounterValueDirect
  const getCounterValueSafely = async (): Promise<bigint> => {
    // @ts-ignore - TypeScript incorrectly infers this as error type, but it returns Promise<bigint>
    const result: any = await CounterAPI.getCounterValueDirect(providers, contractAddress);
    return result as bigint;
  };

  const loadCounterValue = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First check if the contract exists
      const exists = await CounterAPI.contractExists(providers, contractAddress);
      setContractExists(exists);

      if (!exists) {
        throw new Error(`Contract at address ${contractAddress} does not exist or is not a valid counter contract`);
      }

      try {
        // Try to subscribe to the counter contract for real-time updates
        const api = await CounterAPI.subscribe(providers, contractAddress);
        setCounterApi(api);
        setHasRealtimeUpdates(true);

        // Get initial counter value
        const value = await api.getCounterValue();
        setCounterValue(value);

        // Subscribe to state changes for real-time updates
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
      } catch (subscriptionError) {
        // Use console for debugging - logging fallback to direct read
        // eslint-disable-next-line
        console.warn('Failed to subscribe to contract, trying direct read approach:', subscriptionError);
        
        // Fallback: Try to read the counter value directly from the public state
        try {
          const value: bigint = await getCounterValueSafely();
          setCounterValue(value);
          setCounterApi(null); // No API instance for real-time updates
          setHasRealtimeUpdates(false);
          setIsLoading(false);
          
          // Note: No real-time updates available in this mode
          // eslint-disable-next-line
          console.log('Successfully read counter value directly from public state. Real-time updates are not available.');
        } catch (directError) {
          throw new Error(
            `Unable to read from this contract. It may be incompatible or corrupted. Subscription error: ${subscriptionError instanceof Error ? subscriptionError.message : String(subscriptionError)}. Direct read error: ${directError instanceof Error ? directError.message : String(directError)}`,
          );
        }
      }
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err : new Error('Unknown error loading counter'));
      setContractExists(false);
    }
  };

  useEffect(() => {
    void loadCounterValue();
  }, [contractAddress, providers]);

  const refreshValue = async () => {
    if (!counterApi) {
      // If we don't have a full API instance, try direct read
      try {
        setIsLoading(true);
        const value: bigint = await getCounterValueSafely();
        setCounterValue(value);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to refresh counter value'));
        setIsLoading(false);
      }
      return;
    }

    try {
      setIsLoading(true);
      const value = await counterApi.getCounterValue();
      setCounterValue(value);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh counter value'));
      setIsLoading(false);
    }
  };

  return (
    <CounterReaderContext.Provider
      value={{
        counterState,
        counterValue,
        isLoading,
        error,
        contractExists,
        refreshValue,
        hasRealtimeUpdates,
      }}
    >
      {children}
    </CounterReaderContext.Provider>
  );
};

export const CounterReaderDisplay: React.FC = () => {
  const { counterValue, isLoading, error, contractExists, refreshValue } = useCounterReader();

  if (isLoading) {
    return (
      <div className="counter-reader-container">
        <div className="loading-indicator">Loading counter value...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="counter-reader-container">
        <div
          className="error-message"
          style={{
            color: '#d32f2f',
            padding: '16px',
            backgroundColor: '#ffebee',
            borderRadius: '8px',
            border: '1px solid #ffcdd2',
            marginBottom: '16px',
          }}
        >
          <strong>Error:</strong> {error.message}
        </div>
        <button
          className="retry-button"
          onClick={() => {
            void refreshValue();
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!contractExists) {
    return (
      <div className="counter-reader-container">
        <div
          className="warning-message"
          style={{
            color: '#ed6c02',
            padding: '16px',
            backgroundColor: '#fff3e0',
            borderRadius: '8px',
            border: '1px solid #ffcc02',
          }}
        >
          Contract not found or is not a valid counter contract.
        </div>
      </div>
    );
  }

  return (
    <div
      className="counter-reader-container"
      style={{
        padding: '24px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        maxWidth: '400px',
        margin: '0 auto',
      }}
    >
      <h2
        style={{
          margin: '0 0 20px 0',
          color: '#333',
          textAlign: 'center',
        }}
      >
        Counter Reader
      </h2>

      <div
        className="counter-value-display"
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          border: '2px solid #1976d2',
          textAlign: 'center',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '8px',
          }}
        >
          Current Counter Value:
        </div>
        <div
          style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#1976d2',
            fontFamily: 'monospace',
          }}
        >
          {counterValue?.toString() || '0'}
        </div>
      </div>

      <button
        className="refresh-button"
        onClick={() => {
          void refreshValue();
        }}
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '16px',
          backgroundColor: isLoading ? '#cccccc' : '#2e7d32',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
        }}
      >
        {isLoading ? 'Refreshing...' : 'Refresh Value'}
      </button>
    </div>
  );
};

export const CounterAddressInput: React.FC<{
  onAddressSubmit: (_address: ContractAddress) => void;
  initialAddress?: string;
}> = ({ onAddressSubmit, initialAddress = '' }) => {
  const [addressInput, setAddressInput] = useState<string>(initialAddress);
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!addressInput.trim()) {
      setError('Please enter a contract address');
      return;
    }

    try {
      // Basic validation - contract addresses should be hex strings
      if (!/^[a-fA-F0-9]+$/.test(addressInput.trim())) {
        setError('Invalid contract address format. Address should be a hexadecimal string.');
        return;
      }

      onAddressSubmit(addressInput.trim() as ContractAddress);
    } catch {
      setError('Invalid contract address');
    }
  };

  return (
    <div
      className="counter-address-input"
      style={{
        padding: '24px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        maxWidth: '500px',
        margin: '0 auto',
      }}
    >
      <h2
        style={{
          margin: '0 0 20px 0',
          color: '#333',
          textAlign: 'center',
        }}
      >
        Load Counter Contract
      </h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: '#333',
            }}
          >
            Contract Address:
          </label>
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="Enter contract address (hex string)"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontFamily: 'monospace',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <div
            style={{
              color: '#d32f2f',
              backgroundColor: '#ffebee',
              padding: '8px 12px',
              borderRadius: '4px',
              marginBottom: '16px',
              border: '1px solid #ffcdd2',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          Load Counter
        </button>
      </form>
    </div>
  );
};

// Main application component that combines address input and counter reader
export const CounterReaderApplication: React.FC<{
  providers: CounterProviders;
  initialAddress?: ContractAddress;
}> = ({ providers, initialAddress }) => {
  const [contractAddress, setContractAddress] = useState<ContractAddress | undefined>(initialAddress);

  if (!contractAddress) {
    return <CounterAddressInput onAddressSubmit={(address) => setContractAddress(address)} initialAddress={initialAddress} />;
  }

  return (
    <div>
      <div
        style={{
          marginBottom: '20px',
          textAlign: 'center',
          padding: '10px',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
        }}
      >
        <strong>Contract Address:</strong> <code>{contractAddress}</code>
        <button
          onClick={() => setContractAddress(undefined)}
          style={{
            marginLeft: '10px',
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          Change Address
        </button>
      </div>

      <CounterReaderProvider contractAddress={contractAddress} providers={providers}>
        <CounterReaderDisplay />
      </CounterReaderProvider>
    </div>
  );
};
