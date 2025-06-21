/* eslint-disable prettier/prettier */
import React, { useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, Container, Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import { theme } from '../config/theme.js';
import { LocalStateProvider } from '../contexts/LocalStateProviderContext.js';
import { RuntimeConfigurationProvider, useRuntimeConfiguration } from '../config/RuntimeConfiguration.js';
import { MidnightWalletProvider, useMidnightWallet } from './MidnightWallet.js';
import * as pino from 'pino';
import { type NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { CounterApplication } from './CounterComponent.js';
import { CounterReaderApplication } from './CounterReaderComponent.js';
import { type Logger } from 'pino';

const CounterAppContent: React.FC<{ logger: Logger }> = ({ logger }) => {
  const walletState = useMidnightWallet();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

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
            
            {tabValue === 0 && <CounterApplication providers={walletState.providers as any} />}

            {tabValue === 1 && <CounterReaderApplication providers={walletState.providers as any} />}
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
