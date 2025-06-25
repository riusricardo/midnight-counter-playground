import { type Logger } from 'pino';
import { type DockerComposeEnvironment } from 'testcontainers';
import { type Config } from '@repo/counter-api/node-api';
export declare const run: (config: Config, _logger: Logger, dockerEnv?: DockerComposeEnvironment) => Promise<void>;
