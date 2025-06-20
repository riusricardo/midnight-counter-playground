import React from 'react';
// import { DndProvider } from 'react-dnd';
// import { HTML5Backend } from 'react-dnd-html5-backend';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, Container, Box, Typography, Paper } from '@mui/material';
import { theme } from '../config/theme';
import { LocalStateProvider } from '../contexts/LocalStateProviderContext';
import { RuntimeConfigurationProvider, useRuntimeConfiguration } from '../config/RuntimeConfiguration';
import { MidnightWalletProvider, useMidnightWallet } from './MidnightWallet';
import * as pino from 'pino';
import { type NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { CounterApplication } from './CounterComponent';
import { type Logger } from 'pino';

const CounterAppContent: React.FC<{ logger: Logger }> = ({ logger }) => {
  const walletState = useMidnightWallet();

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        Midnight Counter App
      </Typography>
      <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {walletState.isConnected ? (
          <Paper elevation={3} sx={{ p: 3, width: '100%', maxWidth: 600 }}>
            <CounterApplication providers={walletState.providers} logger={logger} />
          </Paper>
        ) : (
          <Typography variant="h6" align="center" color="textSecondary">
            Please connect your wallet to use the Counter Application
          </Typography>
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

// CounterApplication component is imported from CounterComponent.tsx

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
