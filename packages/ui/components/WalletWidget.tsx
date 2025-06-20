import React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  keyframes,
  Snackbar,
  Typography,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CloseIcon from '@mui/icons-material/Close';
import { type Logger } from 'pino';

type Address = string;

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
  snackBarText?: string,
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
        <Snackbar
          autoHideDuration={null}
          open={snackBarText !== undefined}
          message={snackBarText}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        />
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
    if (error) {
      // handleClick();
    } else if (address) {
      // handleClick();
    } else {
      await connect();
    }
  };

  const icon = isConnecting ? <CircularProgress size={10} /> : error ? <ErrorIcon /> : <CheckBoxIcon />;

  const shakeAnimation = keyframes`
    0% {
      transform: rotate(0deg);
    }
    25% {
      transform: rotate(-5deg);
    }
    50% {
      transform: rotate(5deg);
    }
    75% {
      transform: rotate(-5deg);
    }
    100% {
      transform: rotate(0deg);
    }
  `;

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
          <Button
            sx={{
              animation: shake ? `${shakeAnimation} 0.5s` : 'none',
            }}
            startIcon={icon}
            onClick={connectOrShowWallet}
            size="small"
            variant={'outlined'}
          >
            {address ? 'Connected: ' + address.substring(0, 16) + '...' : 'Connect Wallet'}
          </Button>
          {showFloatingBox && (
            <Box
              sx={{
                position: 'absolute',
                top: '30px',
                right: 0,
                mt: 1,
                // transform: 'translateY(100%)',
                backgroundColor: 'secondary.main',
                color: 'cornsilk',
                border: '1px solid cornsilk',
                borderRadius: '6px',
                textAlign: 'left',
                p: 1,
                minWidth: 350,
                zIndex: 2000,
              }}
            >
              <Button
                startIcon={<CloseIcon />}
                onClick={() => {
                  // setOpenFloating(false);
                }}
                sx={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  minWidth: 'auto',
                  padding: 0,
                }}
              ></Button>
            </Box>
          )}
        </Box>
      </Typography>

      <Dialog
        open={walletIsOpen}
        onClose={() => {}}
        aria-labelledby="wallet-dialog-title"
        aria-describedby="wallet-dialog-description"
        PaperProps={{
          style: {
            backgroundColor: 'black',
            borderRadius: '8px',
            padding: '16px',
          },
        }}
      >
        <DialogTitle id="wallet-dialog-title">
          <Typography variant="h1" color="cornsilk" data-testid="textprompt-dialog-title">
            Wallet Information
          </Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="wallet-dialog-description">
            <Typography variant="body1" color="cornsilk">
              Wallet: <span style={{ fontWeight: 'bold' }}>{address ? 'Connected' : 'Disconnected'}</span>
            </Typography>
            <Typography
              variant="body1"
              color="cornsilk"
              sx={{
                overflowWrap: 'break-word',
                whiteSpace: 'normal',
              }}
            >
              Address: <span style={{ fontWeight: 'bold' }}>{address ?? 'Unknown'}</span>
            </Typography>
            <Typography variant="body1" color="cornsilk">
              Proof Server: <span style={{ fontWeight: 'bold' }}>{proofServerIsOnline ? 'Online' : 'Offline'}</span>
            </Typography>
            {error}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {}}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>,
  );
};
