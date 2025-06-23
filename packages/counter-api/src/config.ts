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

import { NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { getDirPath } from './path-resolver.js';
import { existsSync, readFileSync, isNodeEnvironment, pathUtils } from './env.js';

// Get current directory in a way that works in both ESM and CJS
export const currentDir = getDirPath();

// Find the workspace root by looking for package.json or node_modules
function findWorkspaceRoot(startDir: string): string {
  // In browser environments, we can't access the file system
  // so we return a sensible default path
  if (!isNodeEnvironment) {
    // Return a default path that would work in most configurations
    // This will be used for path construction but won't actually access files
    return '/workspace';
  }

  let currentDir = startDir;
  
  while (currentDir !== pathUtils.dirname(currentDir)) {
    const packageJsonPath = pathUtils.join(currentDir, 'package.json');
    try {
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        // Check if this is the workspace root by looking for workspaces field or specific structure
        if (packageJson.workspaces || 
            packageJson.name === 'counter-app' ||
            packageJson.name === 'midnight-counter-app' ||
            (packageJson.name && packageJson.name.includes('midnight-app-test'))) {
          return currentDir;
        }
      }
      
      // Also check if this directory contains the packages folder with our expected structure
      const packagesDir = pathUtils.join(currentDir, 'packages');
      const counterContractDir = pathUtils.join(packagesDir, 'counter-contract');
      if (existsSync(packagesDir) && existsSync(counterContractDir)) {
        return currentDir;
      }
    } catch (e) {
      // Continue searching
    }
    currentDir = pathUtils.dirname(currentDir);
  }
  
  // Fallback: try to find workspace root by going up from current directory
  // This handles cases where we might be deep in a nested structure
  if (isNodeEnvironment && typeof process !== 'undefined') {
    let fallbackDir = process.cwd();
    while (fallbackDir !== pathUtils.dirname(fallbackDir)) {
      const packagesDir = pathUtils.join(fallbackDir, 'packages');
      const counterContractDir = pathUtils.join(packagesDir, 'counter-contract');
      if (existsSync(packagesDir) && existsSync(counterContractDir)) {
        return fallbackDir;
      }
      fallbackDir = pathUtils.dirname(fallbackDir);
    }
  }
  
  // Final fallback to current directory
  return startDir;
}

const workspaceRoot = findWorkspaceRoot(currentDir);

export const contractConfig = {
  privateStateStoreName: 'counter-private-state',
  zkConfigPath: isNodeEnvironment 
    ? pathUtils.resolve(workspaceRoot, 'packages', 'counter-contract', 'src', 'managed', 'counter')
    : '/packages/counter-contract/src/managed/counter', // Browser fallback - relative path
};

export interface Config {
  logDir: string;
  indexer: string;
  indexerWS: string;
  node: string;
  proofServer: string;
}

export class TestnetLocalConfig implements Config {
  logDir = pathUtils.resolve(currentDir, '..', 'logs', 'testnet-local', `${new Date().toISOString()}.log`);
  indexer = 'http://127.0.0.1:8088/api/v1/graphql';
  indexerWS = 'ws://127.0.0.1:8088/api/v1/graphql/ws';
  node = 'http://127.0.0.1:9944';
  proofServer = 'http://127.0.0.1:6300';
  constructor() {
    setNetworkId(NetworkId.TestNet);
  }
}

export class StandaloneConfig implements Config {
  logDir = pathUtils.resolve(currentDir, '..', 'logs', 'standalone', `${new Date().toISOString()}.log`);
  indexer = 'http://127.0.0.1:8088/api/v1/graphql';
  indexerWS = 'ws://127.0.0.1:8088/api/v1/graphql/ws';
  node = 'http://127.0.0.1:9944';
  proofServer = 'http://127.0.0.1:6300';
  constructor() {
    setNetworkId(NetworkId.Undeployed);
  }
}

export class TestnetRemoteConfig implements Config {
  logDir = pathUtils.resolve(currentDir, '..', 'logs', 'testnet-remote', `${new Date().toISOString()}.log`);
  indexer = 'https://indexer.testnet-02.midnight.network/api/v1/graphql';
  indexerWS = 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws';
  node = 'https://rpc.testnet-02.midnight.network';
  proofServer = 'http://127.0.0.1:6300';
  constructor() {
    setNetworkId(NetworkId.TestNet);
  }
}

// Browser-compatible configuration interface
export interface BrowserConfig {
  readonly indexer: string;
  readonly indexerWS: string;
  readonly proofServer: string;
  readonly networkId: NetworkId;
  readonly loggingLevel: string;
}

// Browser-compatible configuration classes
export class BrowserTestnetLocalConfig implements BrowserConfig {
  indexer = 'http://127.0.0.1:8088/api/v1/graphql';
  indexerWS = 'ws://127.0.0.1:8088/api/v1/graphql/ws';
  proofServer = 'http://127.0.0.1:6300';
  networkId = NetworkId.TestNet;
  loggingLevel = 'info';
  constructor() {
    setNetworkId(NetworkId.TestNet);
  }
}

export class BrowserStandaloneConfig implements BrowserConfig {
  indexer = 'http://127.0.0.1:8088/api/v1/graphql';
  indexerWS = 'ws://127.0.0.1:8088/api/v1/graphql/ws';
  proofServer = 'http://127.0.0.1:6300';
  networkId = NetworkId.Undeployed;
  loggingLevel = 'info';
  constructor() {
    setNetworkId(NetworkId.Undeployed);
  }
}

export class BrowserTestnetRemoteConfig implements BrowserConfig {
  indexer = 'https://indexer.testnet-02.midnight.network/api/v1/graphql';
  indexerWS = 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws';
  proofServer = 'http://127.0.0.1:6300';
  networkId = NetworkId.TestNet;
  loggingLevel = 'trace';
  constructor() {
    setNetworkId(NetworkId.TestNet);
  }
}

// Configuration factory for browser environments
export type ConfigEnvironment = 'standalone' | 'testnet-local' | 'testnet-remote';

export function createBrowserConfig(environment: ConfigEnvironment = 'testnet-remote'): BrowserConfig {
  switch (environment) {
    case 'standalone':
      return new BrowserStandaloneConfig();
    case 'testnet-local':
      return new BrowserTestnetLocalConfig();
    case 'testnet-remote':
      return new BrowserTestnetRemoteConfig();
    default:
      throw new Error(`Unknown environment: ${environment}`);
  }
}

// Default browser configuration (mirrors current config.json values)
export function getDefaultBrowserConfig(): BrowserConfig {
  return createBrowserConfig('testnet-remote');
}
