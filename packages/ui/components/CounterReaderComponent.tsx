import React, { useState, useEffect } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { CounterAPI, type CounterProviders } from '@repo/counter-api/unified-api';

interface CounterReaderProviderProps {
  contractAddress: ContractAddress;
  providers: CounterProviders;
  children: React.ReactNode;
}

interface CounterReaderContextType {
  counterValue: bigint | null;
  isLoading: boolean;
  error: Error | null;
  contractExists: boolean;
  refreshValue: () => Promise<void>;
  incrementCounter: () => Promise<void>;
  isIncrementing: boolean;
}

const CounterReaderContext = React.createContext<CounterReaderContextType>({
  counterValue: null,
  isLoading: false,
  error: null,
  contractExists: false,
  refreshValue: async () => {},
  incrementCounter: async () => {},
  isIncrementing: false,
});

export const useCounterReader = () => {
  const context = React.useContext(CounterReaderContext);
  if (context === undefined) {
    throw new Error('useCounterReader must be used within a CounterReaderProvider');
  }
  return context;
};

export const CounterReaderProvider: React.FC<CounterReaderProviderProps> = ({ contractAddress, providers, children }) => {
  const [counterValue, setCounterValue] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [contractExists, setContractExists] = useState<boolean>(false);
  const [counterApi, setCounterApi] = useState<CounterAPI | null>(null);
  const [isIncrementing, setIsIncrementing] = useState<boolean>(false);

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

      // Subscribe to the contract to get an API instance for increment functionality
      const api = await CounterAPI.subscribe(providers, contractAddress);
      setCounterApi(api);

      // Read the counter value directly from the public state
      const value = (await CounterAPI.getCounterValueDirect(providers, contractAddress)) as bigint;
      setCounterValue(value);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err : new Error('Unknown error loading counter'));
      setContractExists(false);
      setCounterApi(null);
    }
  };

  useEffect(() => {
    void loadCounterValue();
  }, [contractAddress, providers]);

  const refreshValue = async () => {
    try {
      setIsLoading(true);
      const value = await CounterAPI.getCounterValueDirect(providers, contractAddress);
      setCounterValue(value);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh counter value'));
      setIsLoading(false);
    }
  };

  const incrementCounter = async () => {
    if (!counterApi) {
      setError(new Error('Counter API not initialized. Cannot increment.'));
      return;
    }

    try {
      setIsIncrementing(true);
      setError(null);
      await counterApi.increment();
      // Refresh the value after incrementing
      await refreshValue();
      setIsIncrementing(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to increment counter'));
      setIsIncrementing(false);
    }
  };

  return (
    <CounterReaderContext.Provider
      value={{
        counterValue,
        isLoading,
        error,
        contractExists,
        refreshValue,
        incrementCounter,
        isIncrementing,
      }}
    >
      {children}
    </CounterReaderContext.Provider>
  );
};

export const CounterReaderDisplay: React.FC = () => {
  const { counterValue, isLoading, error, contractExists, refreshValue, incrementCounter, isIncrementing } = useCounterReader();

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
        disabled={isLoading || isIncrementing}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '16px',
          backgroundColor: isLoading || isIncrementing ? '#cccccc' : '#2e7d32',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading || isIncrementing ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
          marginBottom: '8px',
        }}
      >
        {isLoading ? 'Refreshing...' : 'Refresh Value'}
      </button>

      <button
        className="increment-button"
        onClick={() => {
          void incrementCounter();
        }}
        disabled={isLoading || isIncrementing}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '16px',
          backgroundColor: isLoading || isIncrementing ? '#cccccc' : '#ff9800',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading || isIncrementing ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
        }}
      >
        {isIncrementing ? 'Incrementing...' : 'Increment Counter'}
      </button>
    </div>
  );
};

export const CounterAddressInput: React.FC<{
  onAddressSubmit: (address: ContractAddress) => void;
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

// Helper to format contract address for display
function formatContractAddress(address: string, groupSize = 8): string {
  return address.replace(new RegExp(`(.{${groupSize}})`, 'g'), '$1 ').trim();
}

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
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            background: '#f8fafc',
            border: '1.5px solid #1976d2',
            borderRadius: '6px',
            padding: '12px 18px',
            fontFamily: 'monospace',
            fontSize: '1.1rem',
            letterSpacing: '1px',
            color: '#222',
            minWidth: '540px', // fits 64 hex chars in monospace
            maxWidth: '100%',
            wordBreak: 'break-all',
            boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.07)',
            marginBottom: '8px',
          }}
        >
          <span style={{ color: '#1976d2', fontWeight: 600 }}>Contract Address:</span>
          <br />
          <span style={{ userSelect: 'all', fontWeight: 500 }}>{formatContractAddress(contractAddress)}</span>
        </div>
        <br />
        <button
          onClick={() => setContractAddress(undefined)}
          style={{
            marginTop: '10px',
            padding: '4px 12px',
            fontSize: '13px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            marginLeft: '8px',
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
