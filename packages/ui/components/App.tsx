import React from 'react';
// import { DndProvider } from 'react-dnd';
// import { HTML5Backend } from 'react-dnd-html5-backend';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material';
import { theme } from '../config/theme';
import { LocalStateProvider } from '../contexts/LocalStateProviderContext';
import { RuntimeConfigurationProvider, useRuntimeConfiguration } from '../config/RuntimeConfiguration';
import { MidnightWalletProvider } from './MidnightWallet';
import * as pino from 'pino';
import { type NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

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
        {/* App content goes here, e.g. routes or main page */}
        <div />
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
