// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { type Resource } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import path from 'path';
import { configureProviders, CounterProviders } from '@repo/counter-api/node-api';
import { setLogger, CounterAPI, currentDir } from '@repo/counter-api';
import { TestEnvironment } from './commons';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { contractConfig, createLogger } from '@repo/counter-api';

const logDir = path.resolve(currentDir, '..', 'logs', 'tests', `${new Date().toISOString()}.log`);
const logger = await createLogger(logDir);

describe('API', () => {
  let testEnvironment: TestEnvironment;
  let wallet: Wallet & Resource;
  let providers: CounterProviders;

  beforeAll(
    async () => {
      setLogger(logger);
      testEnvironment = new TestEnvironment(logger);
      const testConfiguration = await testEnvironment.start();
      wallet = await testEnvironment.getWallet();
      providers = await configureProviders(
        wallet,
        testConfiguration.dappConfig,
        new NodeZkConfigProvider<'increment'>(contractConfig.zkConfigPath),
      );
    },
    1000 * 60 * 45,
  );

  afterAll(async () => {
    await testEnvironment.saveWalletCache();
    await testEnvironment.shutdown();
  });

  it('should deploy the contract and increment the counter [@slow]', async () => {
    // Deploy using new unified API - now returns CounterAPI instance
    const counterApi = await CounterAPI.deploy(providers, { value: 0 });
    expect(counterApi).not.toBeNull();

    // Get initial counter value using new unified API
    const counter = await CounterAPI.getCounterInfo(counterApi);
    expect(counter.counterValue).toEqual(BigInt(0));

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Increment using new unified API - use incrementWithTxInfo for transaction response
    const response = await CounterAPI.incrementWithTxInfo(counterApi);
    expect(response.txHash || response.txId).toMatch(/[0-9a-f]{64}/);
    expect(response.blockHeight).toBeGreaterThan(BigInt(0));

    // Get counter value after increment
    const counterAfter = await CounterAPI.getCounterInfo(counterApi);
    expect(counterAfter.counterValue).toEqual(BigInt(1));
    expect(counterAfter.contractAddress).toEqual(counter.contractAddress);
  });

  it('should store and retrieve credential subject in CounterPrivateState [@slow]', async () => {
    // Deploy a new contract for this test
    const counterApi = await CounterAPI.deploy(providers, { value: 0 });
    expect(counterApi).not.toBeNull();

    // Create test credential data matching the CredentialSubject structure
    const testCredentialSubject = {
      id: new Uint8Array(32).fill(1), // Test ID
      first_name: new TextEncoder().encode('TestUser').slice(0, 32), // Encode and pad to 32 bytes
      last_name: new TextEncoder().encode('TestLastName').slice(0, 32), // Encode and pad to 32 bytes
      birth_timestamp: BigInt(Date.now() - 25 * 365 * 24 * 60 * 60 * 1000), // 25 years ago
    };

    // Pad the byte arrays to 32 bytes
    const paddedFirstName = new Uint8Array(32);
    paddedFirstName.set(testCredentialSubject.first_name);

    const paddedLastName = new Uint8Array(32);
    paddedLastName.set(testCredentialSubject.last_name);

    const finalCredentialSubject = {
      id: testCredentialSubject.id,
      first_name: paddedFirstName,
      last_name: paddedLastName,
      birth_timestamp: testCredentialSubject.birth_timestamp,
    };

    // Initially, no credential subject should exist
    const initialCredential = await counterApi.getCredentialSubject();
    expect(initialCredential).toBeNull();

    // User should not be verified initially
    const initialVerification = await counterApi.isUserVerified();
    expect(initialVerification).toBe(false);

    // Update the credential subject
    await counterApi.updateCredentialSubject(finalCredentialSubject);

    // Retrieve the credential subject
    const retrievedCredential = await counterApi.getCredentialSubject();
    expect(retrievedCredential).not.toBeNull();
    expect(retrievedCredential.id).toEqual(finalCredentialSubject.id);
    expect(retrievedCredential.first_name).toEqual(finalCredentialSubject.first_name);
    expect(retrievedCredential.last_name).toEqual(finalCredentialSubject.last_name);
    expect(retrievedCredential.birth_timestamp).toEqual(finalCredentialSubject.birth_timestamp);

    // User should now be verified (over 18)
    const finalVerification = await counterApi.isUserVerified();
    expect(finalVerification).toBe(true);

    // Test that the private state persists across API calls
    const retrievedAgain = await counterApi.getCredentialSubject();
    expect(retrievedAgain).toEqual(retrievedCredential);
  });

  it('should correctly validate age verification [@slow]', async () => {
    // Deploy a new contract for this test
    const counterApi = await CounterAPI.deploy(providers, { value: 0 });

    // Test with under-age user (17 years old)
    const underageCredential = {
      id: new Uint8Array(32).fill(2),
      first_name: new Uint8Array(32).fill(0),
      last_name: new Uint8Array(32).fill(0),
      birth_timestamp: BigInt(Date.now() - 17 * 365 * 24 * 60 * 60 * 1000), // 17 years ago
    };

    await counterApi.updateCredentialSubject(underageCredential);
    const underageVerification = await counterApi.isUserVerified();
    expect(underageVerification).toBe(false);

    // Test with legal age user (18 years old)
    const legalAgeCredential = {
      id: new Uint8Array(32).fill(3),
      first_name: new Uint8Array(32).fill(0),
      last_name: new Uint8Array(32).fill(0),
      birth_timestamp: BigInt(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000), // Exactly 18 years ago
    };

    await counterApi.updateCredentialSubject(legalAgeCredential);
    const legalAgeVerification = await counterApi.isUserVerified();
    expect(legalAgeVerification).toBe(true);
  });
});
