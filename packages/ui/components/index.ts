export { default as App } from './App.js';

// Re-export browser utilities that were moved to @repo/counter-api/browser
export {
  connectToWallet,
  WrappedPublicDataProvider,
  WrappedPrivateStateProvider,
  retryWithBackoff,
} from '@repo/counter-api/browser';
