/* eslint-disable prettier/prettier */
import React, { useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, Container, Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import { theme } from '../config/theme.js';
import { LocalStateProvider } from '../contexts/LocalStateProviderContext.js';
import { RuntimeConfigurationProvider, useRuntimeConfiguration } from '../config/RuntimeConfiguration.js';
import { MidnightWalletProvider, ProviderCallbackAction, useMidnightWallet, WalletAPI } from './MidnightWallet.js';
import * as pino from 'pino';
import { type NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { CounterApplication } from './CounterComponent.js';
import { CounterReaderApplication } from './CounterReaderComponent.js';
import { type Logger } from 'pino';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { PublicDataProvider, WalletProvider, MidnightProvider, PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types';
import { proofClient } from './proofClient.js';
import { CachedFetchZkConfigProvider } from './zkConfigProvider.js';
import { CounterPrivateState } from '@midnight-ntwrk/counter-contract';
import { CounterCircuits, CounterProviders} from '@repo/counter-api';

const providers: (
  publicDataProvider: PublicDataProvider,
  walletProvider: WalletProvider,
  midnightProvider: MidnightProvider,
  walletAPI: WalletAPI,
  callback: (action: ProviderCallbackAction) => void,
) => CounterProviders = (
  publicDataProvider: PublicDataProvider,
  walletProvider: WalletProvider,
  midnightProvider: MidnightProvider,
  walletAPI: WalletAPI,
  callback: (action: ProviderCallbackAction) => void,
) => {
  const privateStateProvider: PrivateStateProvider<'counterPrivateState', CounterPrivateState> = levelPrivateStateProvider({
    privateStateStoreName: 'counter-private-state',
  });
  const proofProvider = proofClient(walletAPI.uris.proverServerUri);
  return {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider: new CachedFetchZkConfigProvider<CounterCircuits>(
      window.location.origin,
      fetch.bind(window),
      callback,
    ),
    proofProvider,
    walletProvider,
    midnightProvider,
  };
};

const CounterAppContent: React.FC<{ logger: Logger }> = ({ logger }) => {
  const walletState = useMidnightWallet();
  const [tabValue, setTabValue] = useState(0);
  const [counterProviders, setCounterProviders] = useState<CounterProviders | null>(null);
  const [providersLoading, setProvidersLoading] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Initialize providers when wallet is connected
  React.useEffect(() => {
    if (walletState.walletAPI && walletState.isConnected) {
      setProvidersLoading(true);
      try {
        const midnightProviders = providers(
          walletState.publicDataProvider,
          walletState.walletProvider,
          walletState.midnightProvider,
          walletState.walletAPI,
          walletState.callback,
        );
        setCounterProviders(midnightProviders);
      } catch (error) {
        console.error('Failed to initialize providers:', error);
      } finally {
        setProvidersLoading(false);
      }
    } else {
      setCounterProviders(null);
      setProvidersLoading(false);
    }
  }, [walletState.walletAPI, walletState.isConnected, walletState.publicDataProvider, walletState.walletProvider, walletState.midnightProvider, walletState.callback]);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {/* Wallet Widget - positioned at top right */}
      <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 1000 }}>{walletState.widget}</Box>

      <Typography variant="h3" component="h1" gutterBottom align="center">
        Midnight Counter App
      </Typography>
      <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 600 }}>
        {walletState.isConnected ? (
          <Paper elevation={3} sx={{ p: 3, width: '100%', maxWidth: 600 }}>
            <Tabs value={tabValue} onChange={handleTabChange} centered sx={{ mb: 3 }}>
              <Tab label="Deploy & Manage" />
              <Tab label="Read Existing Contract" />
            </Tabs>
            
            {providersLoading ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography>Loading providers...</Typography>
              </Box>
            ) : (
              <>
                {tabValue === 0 && counterProviders && <CounterApplication providers={counterProviders} />}
                {tabValue === 1 && counterProviders && <CounterReaderApplication providers={counterProviders} />}
              </>
            )}
          </Paper>
        ) : (
          <Paper elevation={3} sx={{ p: 3, width: '100%', maxWidth: 600, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom color="textSecondary">
              Welcome to Midnight Counter App
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
              Please connect your Midnight Lace wallet to start using the Counter Application
            </Typography>
            {walletState.widget}
          </Paper>
        )}
      </Box>
    </Container>
  );
};

const AppWithConfig: React.FC = () => {
  const config = useRuntimeConfiguration();
  const logger = pino.pino({
    level: config.LOGGING_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
  });
  setNetworkId(config.NETWORK_ID as NetworkId);

  return (
    <LocalStateProvider logger={logger}>
      <MidnightWalletProvider logger={logger}>
        <CounterAppContent logger={logger} />
      </MidnightWalletProvider>
    </LocalStateProvider>
  );
};

const App: React.FC = () => {
  return (
    <>
      <CssBaseline />
      <RuntimeConfigurationProvider>
        <ThemeProvider theme={theme}>
          <AppWithConfig />
        </ThemeProvider>
      </RuntimeConfigurationProvider>
    </>
  );
};

export default App;
