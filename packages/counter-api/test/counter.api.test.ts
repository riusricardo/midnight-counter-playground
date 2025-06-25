// This file is part of midnightntwrk/example-counter.
// Copyright (C) 2025 Midnight Foundation
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
});
