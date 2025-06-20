import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Logger } from 'pino';
import { type CounterCircuits } from '@repo/counter-api';
import {
  type BalancedTransaction,
  createBalancedTx,
  type ProofProvider,
  type PublicDataProvider,
  type UnbalancedTransaction,
} from '@midnight-ntwrk/midnight-js-types';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { Transaction, type TransactionId } from '@midnight-ntwrk/ledger';
import { Transaction as ZswapTransaction } from '@midnight-ntwrk/zswap';
import { getLedgerNetworkId, getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { useRuntimeConfiguration } from '../config/RuntimeConfiguration';
import { useLocalState } from '../hooks/useLocalState';
import type { ZKConfigProvider, WalletProvider, MidnightProvider } from '@midnight-ntwrk/midnight-js-types';
import { MidnightWalletErrorType, WalletWidget } from './WalletWidget';
import { connectToWallet } from './connectToWallet';
import { noopProofClient, proofClient } from './proofClient';
import { WrappedPublicDataProvider } from './publicDataProvider';
import { WrappedPrivateStateProvider } from './privateStateProvider';
import { CachedFetchZkConfigProvider } from './zkConfigProvider';

// Fix SSR-safe browser checks and stub navigator/window/fetch for SSR
function isChromeBrowser(): boolean {
  if (typeof globalThis !== 'undefined' && globalThis.navigator) {
    const userAgent = globalThis.navigator.userAgent.toLowerCase();
    return userAgent.includes('chrome') && !userAgent.includes('edge') && !userAgent.includes('opr');
  }
  return false;
}

interface MidnightWalletState {
  isConnected: boolean;
  proofServerIsOnline: boolean;
  address?: Address;
  widget?: React.ReactNode;
  walletAPI?: WalletAPI;
  privateStateProvider: any;
  zkConfigProvider: ZKConfigProvider<CounterCircuits>;
  proofProvider: ProofProvider<CounterCircuits>;
  publicDataProvider: PublicDataProvider;
  walletProvider: WalletProvider;
  midnightProvider: MidnightProvider;
  providers: any;
  shake: () => void;
}

export interface WalletAPI {
  wallet: DAppConnectorWalletAPI;
  coinPublicKey: CoinPublicKey;
  uris: ServiceUriConfig;
}

// Remove broken imports and use local type definitions for Address, CoinPublicKey, DAppConnectorWalletAPI, ServiceUriConfig
// These types are not available from the Midnight packages directly, so we define minimal local types for UI use.
export type Address = string;
export type CoinPublicKey = string;
export interface DAppConnectorWalletAPI {
  state: () => Promise<{ address: Address; coinPublicKey: CoinPublicKey }>;
  submitTransaction: () => Promise<any>;
  balanceAndProveTransaction: () => Promise<any>;
}
export interface ServiceUriConfig {
  proverServerUri: string;
}

export const getErrorType = (error: Error): MidnightWalletErrorType => {
  if (error.message.includes('Could not find Midnight Lace wallet')) {
    return MidnightWalletErrorType.WALLET_NOT_FOUND;
  }
  if (error.message.includes('Incompatible version of Midnight Lace wallet')) {
    return MidnightWalletErrorType.INCOMPATIBLE_API_VERSION;
  }
  if (error.message.includes('Wallet connector API has failed to respond')) {
    return MidnightWalletErrorType.TIMEOUT_API_RESPONSE;
  }
  if (error.message.includes('Could not find wallet connector API')) {
    return MidnightWalletErrorType.TIMEOUT_FINDING_API;
  }
  if (error.message.includes('Unable to enable connector API')) {
    return MidnightWalletErrorType.ENABLE_API_FAILED;
  }
  if (error.message.includes('Application is not authorized')) {
    return MidnightWalletErrorType.UNAUTHORIZED;
  }
  return MidnightWalletErrorType.UNKNOWN_ERROR;
};
const MidnightWalletContext = createContext<MidnightWalletState | null>(null);

export const useMidnightWallet = (): MidnightWalletState => {
  const walletState = useContext(MidnightWalletContext);
  if (!walletState) {
    throw new Error('MidnightWallet not loaded');
  }
  return walletState;
};

interface MidnightWalletProviderProps {
  children: React.ReactNode;
  logger: Logger;
}

// Fix: Remove unused variable warnings and clean up unused parameters
export const MidnightWalletProvider: React.FC<MidnightWalletProviderProps> = ({ logger, children }) => {
  const [isConnecting, setIsConnecting] = React.useState<boolean>(false);
  const [walletError, setWalletError] = React.useState<MidnightWalletErrorType | undefined>(undefined);
  const [address, setAddress] = React.useState<Address | undefined>(undefined);
  const [proofServerIsOnline, setProofServerIsOnline] = React.useState<boolean>(false);
  const config = useRuntimeConfiguration();
  const [openWallet, setOpenWallet] = React.useState(false);
  const [isRotate, setRotate] = React.useState(false);
  const localState = useLocalState() as ReturnType<typeof useLocalState>;
  const [snackBarText, setSnackBarText] = useState<string | undefined>(undefined);
  const [walletAPI, setWalletAPI] = useState<WalletAPI | undefined>(undefined);
  const [floatingOpen] = React.useState(true);

  const privateStateProvider = useMemo(
    () =>
      new WrappedPrivateStateProvider(
        levelPrivateStateProvider({
          privateStateStoreName: 'counter-private-state',
        }),
        logger,
      ),
    [logger],
  );

  // Remove unused parameter in providerCallback
  const providerCallback = (): void => {
    // no-op
  };

  // Provide a no-op fallback for zkConfigProvider
  // Fix: Use multiline for 'not implemented' errors for formatting
  const emptyZkConfigProvider: ZKConfigProvider<CounterCircuits> = {
    async getZKIR() {
      throw new Error('Not implemented');
    },
    async getProverKey() {
      throw new Error('Not implemented');
    },
    async getVerifierKey() {
      throw new Error('Not implemented');
    },
    async getVerifierKeys() {
      throw new Error('Not implemented');
    },
    async get() {
      throw new Error('Not implemented');
    },
  };
  const zkConfigProvider = useMemo(
    () =>
      typeof globalThis !== 'undefined' && globalThis.window && typeof globalThis.window.fetch === 'function'
        ? new CachedFetchZkConfigProvider<CounterCircuits>(
            globalThis.window.location.origin,
            globalThis.window.fetch.bind(globalThis.window),
            providerCallback,
          )
        : emptyZkConfigProvider,
    [],
  );

  const publicDataProvider = useMemo(
    () =>
      new WrappedPublicDataProvider(
        indexerPublicDataProvider(config.INDEXER_URI, config.INDEXER_WS_URI),
        providerCallback,
        logger,
      ),
    [],
  );

  function shake(): void {
    setRotate(true);
    setSnackBarText('Please connect to your Midnight Lace wallet');
    setTimeout(() => {
      setRotate(false);
      setSnackBarText(undefined);
    }, 3000);
  }

  const proofProvider = useMemo(() => {
    if (walletAPI) {
      return proofClient(walletAPI.uris.proverServerUri);
    } else {
      return noopProofClient();
    }
  }, [walletAPI]);

  const walletProvider: WalletProvider = useMemo(() => {
    if (walletAPI) {
      return {
        coinPublicKey: walletAPI.coinPublicKey,
        encryptionPublicKey: '', // fallback for required property
        balanceTx(tx: UnbalancedTransaction): Promise<BalancedTransaction> {
          const ledgerNetworkId = getLedgerNetworkId();
          const zswapNetworkId = getZswapNetworkId();
          const zswapTx = ZswapTransaction.deserialize(tx.serialize(ledgerNetworkId), zswapNetworkId);
          // Defensive: check for serialize method
          if (zswapTx && typeof (zswapTx as { serialize?: unknown }).serialize === 'function') {
            const deserialized = Transaction.deserialize(
              // Use 'unknown' for type assertion to avoid unused parameter warning
              (zswapTx as unknown as { serialize: (networkId: unknown) => Uint8Array }).serialize(zswapNetworkId),
              ledgerNetworkId,
            );
            return Promise.resolve(createBalancedTx(deserialized));
          }
          return Promise.reject(new Error('Invalid zswapTx object'));
        },
      };
    } else {
      return {
        coinPublicKey: '',
        encryptionPublicKey: '',
        // Fix: Remove unused parameters in fallback WalletProvider
        balanceTx(): Promise<BalancedTransaction> {
          return Promise.reject(new Error('readonly'));
        },
      };
    }
  }, [walletAPI]);

  const midnightProvider: MidnightProvider = useMemo(() => {
    if (walletAPI) {
      return {
        submitTx(): Promise<string> {
          // Assume submitTransaction returns a string TransactionId
          return walletAPI.wallet.submitTransaction() as Promise<string>;
        },
      };
    } else {
      return {
        // Fix: Remove unused parameters in fallback MidnightProvider
        submitTx(): Promise<TransactionId> {
          return Promise.reject(new Error('readonly'));
        },
      };
    }
  }, [walletAPI]);

  const [walletState, setWalletState] = React.useState<MidnightWalletState>({
    isConnected: false,
    proofServerIsOnline: false,
    address: undefined,
    widget: undefined,
    walletAPI,
    privateStateProvider,
    zkConfigProvider,
    proofProvider,
    publicDataProvider,
    walletProvider,
    midnightProvider,
    shake,
    providers: {
      privateStateProvider,
      publicDataProvider,
      zkConfigProvider,
      proofProvider,
      walletProvider,
      midnightProvider,
    },
  });

  async function checkProofServerStatus(proverServerUri: string): Promise<void> {
    const fetchFn = typeof globalThis !== 'undefined' && globalThis.fetch ? globalThis.fetch : undefined;
    if (!fetchFn) {
      setProofServerIsOnline(false);
      return;
    }
    try {
      const response = await fetchFn(proverServerUri);
      if (!response.ok) {
        setProofServerIsOnline(false);
      }
      const text = await response.text();
      setProofServerIsOnline(text.includes("We're alive 🎉!"));
    } catch {
      setProofServerIsOnline(false);
    }
  }

  async function connect(manual: boolean): Promise<void> {
    localState.setLaceAutoConnect(true);
    setIsConnecting(true);
    let walletResult;
    try {
      walletResult = await connectToWallet(logger);
    } catch (e) {
      const walletError = getErrorType(e as Error);
      setWalletError(walletError);
      setIsConnecting(false);
    }
    if (!walletResult) {
      setIsConnecting(false);
      if (manual) setOpenWallet(true);
      return;
    }
    await checkProofServerStatus(walletResult.uris.proverServerUri);
    try {
      // Use type assertion for wallet and state to fix unsafe errors
      const wallet = walletResult.wallet as DAppConnectorWalletAPI;
      const reqState = await (wallet.state() as Promise<{ address: Address; coinPublicKey: CoinPublicKey }>);
      setAddress(reqState.address);
      setWalletAPI({
        wallet,
        coinPublicKey: reqState.coinPublicKey,
        uris: walletResult.uris,
      });
    } catch {
      setWalletError(MidnightWalletErrorType.TIMEOUT_API_RESPONSE);
    }
    setIsConnecting(false);
  }

  useEffect(() => {
    setWalletState((state) => ({
      ...state,
      walletAPI,
      privateStateProvider,
      zkConfigProvider,
      proofProvider,
      publicDataProvider,
      walletProvider,
      midnightProvider,
      providers: {
        privateStateProvider,
        publicDataProvider,
        zkConfigProvider,
        proofProvider,
        walletProvider,
        midnightProvider,
      },
    }));
  }, [walletAPI, privateStateProvider, zkConfigProvider, proofProvider, publicDataProvider, walletProvider, midnightProvider]);

  useEffect(() => {
    setWalletState((state) => ({
      ...state,
      isConnected: !!address,
      proofServerIsOnline,
      address,
      widget: WalletWidget(
        () => connect(true),
        isRotate,
        openWallet,
        isChromeBrowser(),
        proofServerIsOnline,
        isConnecting,
        logger,
        floatingOpen,
        address,
        walletError,
        snackBarText,
      ),
      shake,
    }));
  }, [isConnecting, walletError, address, openWallet, isRotate, proofServerIsOnline, snackBarText]);

  useEffect(() => {
    if (!walletState.isConnected && !isConnecting && !walletError && localState.isLaceAutoConnect()) {
      void connect(false); // auto connect
    }
  }, [walletState.isConnected, isConnecting]);

  return <MidnightWalletContext.Provider value={walletState}>{children}</MidnightWalletContext.Provider>;
};
