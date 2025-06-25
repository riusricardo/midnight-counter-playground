import React from 'react';
import type { Address } from '@midnight-ntwrk/wallet-api';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { type Logger } from 'pino';

export enum MidnightWalletErrorType {
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  INCOMPATIBLE_API_VERSION = 'INCOMPATIBLE_API_VERSION',
  TIMEOUT_FINDING_API = 'TIMEOUT_FINDING_API',
  TIMEOUT_API_RESPONSE = 'TIMEOUT_API_RESPONSE',
  ENABLE_API_FAILED = 'ENABLE_API_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export const WalletWidget = (
  connect: () => Promise<void>,
  shake: boolean,
  walletIsOpen: boolean,
  isChromeBrowser: boolean,
  proofServerIsOnline: boolean,
  isConnecting: boolean,
  _logger: Logger,
  isFloatingOpen: boolean,
  address?: Address,
  walletError?: MidnightWalletErrorType,
): React.ReactNode => {
  const box = (content: React.ReactNode): React.ReactNode => {
    return (
      <Box
        paddingBottom={'20px'}
        display="flex"
        alignItems="right"
        justifyContent="right"
        flexDirection="column"
        borderRadius={2}
        borderColor="grey.300"
      >
        {content}
      </Box>
    );
  };

  let error: React.ReactNode;

  if (!isChromeBrowser) {
    error = <Alert severity="warning">This application only works on Chrome browsers. Please switch to Chrome.</Alert>;
  }

  if (walletError) {
    if (walletError === MidnightWalletErrorType.UNAUTHORIZED) {
      error = (
        <Alert severity="error">
          Connection Failed: You did not authorize the DApp to connect to your Midnight wallet. Please try again if you wish to
          proceed.
        </Alert>
      );
    } else if (walletError === MidnightWalletErrorType.WALLET_NOT_FOUND) {
      error = (
        <Alert severity="error">
          Connection Failed: Could not find Midnight Lace wallet
          <br />
          <a href={'https://docs.midnight.network/develop/tutorial/using/chrome-ext'} target="_blank" rel="noopener noreferrer">
            Learn how to install the wallet to use this application.
          </a>
        </Alert>
      );
    } else
      error = (
        <Alert severity="error">
          {`Error: ${walletError.replace(/_/g, ' ')}.`}
          <br />
          <a href={'https://docs.midnight.network/develop/tutorial/using/chrome-ext'} target="_blank" rel="noopener noreferrer">
            Learn how to resolve this issue.
          </a>
        </Alert>
      );
  }

  const connectOrShowWallet: () => Promise<void> = async () => {
    if (!error && !address) {
      await connect();
    }
  };

  const icon = isConnecting ? <CircularProgress size={10} /> : error ? <ErrorIcon /> : <CheckBoxIcon />;

  let showFloatingBox = !proofServerIsOnline || !address;
  if (!isFloatingOpen || isConnecting) {
    showFloatingBox = false;
  }

  return box(
    <div>
      <Typography align="right" variant="body2" color="cornsilk">
        <Box
          sx={{
            position: 'relative',
            display: 'inline-block',
          }}
        >
          <Button startIcon={icon} onClick={connectOrShowWallet} size="small" variant={'outlined'}>
            {address
              ? 'Connected: ' + address.substring(0, 6) + '...' + address.substring(22, 26) + '...' + address.substring(124, 132)
              : 'Connect Wallet'}
          </Button>
          {showFloatingBox && (
            <Box
              sx={{
                position: 'absolute',
                top: '30px',
                right: 0,
                mt: 1,
                backgroundColor: 'secondary.main',
                color: 'cornsilk',
                border: '1px solid cornsilk',
                borderRadius: '6px',
                textAlign: 'left',
                p: 1,
                minWidth: 350,
                zIndex: 2000,
              }}
            ></Box>
          )}
        </Box>
      </Typography>
    </div>,
  );
};
