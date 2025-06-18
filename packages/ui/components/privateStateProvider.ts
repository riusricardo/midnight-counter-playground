import { type SigningKey } from '@midnight-ntwrk/compact-runtime';
import type { Logger } from 'pino';

// Remove broken import
// import { type PrivateStateSchema } from '@midnight-ntwrk/midnight-js-types/dist/private-state-provider';

// Use minimal typing for compatibility with the rest of the codebase
export class WrappedPrivateStateProvider {
  constructor(
    private readonly privateDataProvider: any,
    private readonly logger: Logger,
  ) {}

  set(key: string, state: unknown): Promise<void> {
    this.logger.trace(`Setting private state for key: ${key}`);
    return this.privateDataProvider.set(key, state);
  }

  get(key: string): Promise<unknown | null> {
    this.logger.trace(`Getting private state for key: ${key}`);
    return this.privateDataProvider.get(key);
  }

  remove(key: string): Promise<void> {
    this.logger.trace(`Removing private state for key: ${key}`);
    return this.privateDataProvider.remove(key);
  }

  clear(): Promise<void> {
    this.logger.trace('Clearing private state');
    return this.privateDataProvider.clear();
  }

  setSigningKey(key: string, signingKey: SigningKey): Promise<void> {
    this.logger.trace(`Setting signing key for key: ${key}`);
    return this.privateDataProvider.setSigningKey(key, signingKey);
  }

  getSigningKey(key: string): Promise<SigningKey | null> {
    this.logger.trace(`Getting signing key for key: ${key}`);
    return this.privateDataProvider.getSigningKey(key);
  }

  removeSigningKey(key: string): Promise<void> {
    this.logger.trace(`Removing signing key for key: ${key}`);
    return this.privateDataProvider.removeSigningKey(key);
  }

  clearSigningKeys(): Promise<void> {
    this.logger.trace('Clearing signing keys');
    return this.privateDataProvider.clearSigningKeys();
  }
}
