
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
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { StandaloneConfig, buildWalletAndWaitForFunds, buildFreshWallet, configureProviders, } from '@repo/counter-api/node-api';
import { setLogger, CounterAPI } from '@repo/counter-api/common-api';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { contractConfig } from '@repo/counter-api';
import { URL } from 'url';
let logger;
/**
 * This seed gives access to tokens minted in the genesis block of a local development node - only
 * used in standalone networks to build a wallet with initial funds.
 */
const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';
const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new counter contract
  2. Join an existing counter contract
  3. Exit
Which would you like to do? `;
const MAIN_LOOP_QUESTION = `
You can do one of the following:
  1. Increment
  2. Display current counter value
  3. Exit
Which would you like to do? `;
const join = async (providers, rli) => {
    const contractAddress = await rli.question('What is the contract address (in hex)? ');
    return await CounterAPI.connect(providers, contractAddress);
};
const deployOrJoin = async (providers, rli) => {
    while (true) {
        // while loop for CLI menu
        const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
        switch (choice) {
            case '1':
                return await CounterAPI.deploy(providers, { value: 0 });
            case '2':
                return await join(providers, rli);
            case '3':
                logger.info('Exiting...');
                return null;
            default:
                logger.error(`Invalid choice: ${choice}`);
        }
    }
};
const mainLoop = async (providers, rli) => {
    const counterApi = await deployOrJoin(providers, rli);
    if (counterApi === null) {
        return;
    }
    while (true) {
        // while loop for CLI menu
        const choice = await rli.question(MAIN_LOOP_QUESTION);
        switch (choice) {
            case '1':
                await CounterAPI.incrementWithTxInfo(counterApi);
                break;
            case '2':
                await CounterAPI.getCounterInfo(counterApi);
                break;
            case '3':
                logger.info('Exiting...');
                return;
            default:
                logger.error(`Invalid choice: ${choice}`);
        }
    }
};
const buildWalletFromSeed = async (config, rli) => {
    const seed = await rli.question('Enter your wallet seed: ');
    return await buildWalletAndWaitForFunds(config, seed, '');
};
const WALLET_LOOP_QUESTION = `
You can do one of the following:
  1. Build a fresh wallet
  2. Build wallet from a seed
  3. Exit
Which would you like to do? `;
const buildWallet = async (config, rli) => {
    if (config instanceof StandaloneConfig) {
        return await buildWalletAndWaitForFunds(config, GENESIS_MINT_WALLET_SEED, '');
    }
    while (true) {
        // while loop for CLI menu
        const choice = await rli.question(WALLET_LOOP_QUESTION);
        switch (choice) {
            case '1':
                return await buildFreshWallet(config);
            case '2':
                return await buildWalletFromSeed(config, rli);
            case '3':
                logger.info('Exiting...');
                return null;
            default:
                logger.error(`Invalid choice: ${choice}`);
        }
    }
};
const mapContainerPort = (env, url, containerName) => {
    const mappedUrl = new URL(url);
    const container = env.getContainer(containerName);
    mappedUrl.port = String(container.getFirstMappedPort());
    return mappedUrl.toString().replace(/\/+$/, '');
};
export const run = async (config, _logger, dockerEnv) => {
    logger = _logger;
    setLogger(_logger);
    const rli = createInterface({ input, output, terminal: true });
    let env;
    if (dockerEnv !== undefined) {
        env = await dockerEnv.up();
        if (config instanceof StandaloneConfig) {
            config.indexer = mapContainerPort(env, config.indexer, 'counter-indexer');
            config.indexerWS = mapContainerPort(env, config.indexerWS, 'counter-indexer');
            config.node = mapContainerPort(env, config.node, 'counter-node');
            config.proofServer = mapContainerPort(env, config.proofServer, 'counter-proof-server');
        }
    }
    const wallet = await buildWallet(config, rli);
    try {
        if (wallet !== null) {
            const providers = await configureProviders(wallet, config, new NodeZkConfigProvider(contractConfig.zkConfigPath));
            await mainLoop(providers, rli);
        }
    }
    catch (e) {
        if (e instanceof Error) {
            logger.error(`Found error '${e.message}'`);
            logger.info('Exiting...');
            logger.debug(`${e.stack}`);
        }
        else {
            throw e;
        }
    }
    finally {
        try {
            rli.close();
            rli.removeAllListeners();
        }
        catch (e) {
            logger.error(`Error closing readline interface: ${e}`);
        }
        finally {
            try {
                if (wallet !== null) {
                    await wallet.close();
                }
            }
            catch (e) {
                logger.error(`Error closing wallet: ${e}`);
            }
            finally {
                try {
                    if (env !== undefined) {
                        await env.down();
                        logger.info('Goodbye');
                    }
                }
                catch (e) {
                    logger.error(`Error shutting down docker environment: ${e}`);
                }
            }
        }
    }
};
//# sourceMappingURL=cli.js.map