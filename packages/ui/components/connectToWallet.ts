import type { Logger } from 'pino';
import { concatMap, filter, firstValueFrom, interval, map, of, take, tap, throwError, timeout } from 'rxjs';
import { pipe as fnPipe } from 'fp-ts/function';
import semver from 'semver';

type DAppConnectorAPI = unknown;
type DAppConnectorWalletAPI = unknown;
type ServiceUriConfig = { proverServerUri: string };

export const connectToWallet = (logger: Logger): Promise<{ wallet: DAppConnectorWalletAPI; uris: ServiceUriConfig }> => {
  const COMPATIBLE_CONNECTOR_API_VERSION = '1.x';

  return firstValueFrom(
    fnPipe(
      interval(100),
      map(() => {
        if (typeof globalThis !== 'undefined' && typeof globalThis.window !== 'undefined') {
          // @ts-ignore
          return globalThis.window.midnight?.mnLace as any;
        }
        return undefined;
      }),
      tap((connectorAPI) => {
        logger.info(connectorAPI, 'Check for wallet connector API');
      }),
      filter((connectorAPI): connectorAPI is any => !!connectorAPI),
      concatMap((connectorAPI) =>
        semver.satisfies((connectorAPI as any).apiVersion, COMPATIBLE_CONNECTOR_API_VERSION)
          ? of(connectorAPI)
          : throwError(() => {
              logger.error(
                {
                  expected: COMPATIBLE_CONNECTOR_API_VERSION,
                  actual: (connectorAPI as any).apiVersion,
                },
                'Incompatible version of wallet connector API',
              );

              return new Error(
                `Incompatible version of Midnight Lace wallet found. Require '${COMPATIBLE_CONNECTOR_API_VERSION}', got '${(connectorAPI as any).apiVersion}'.`,
              );
            }),
      ),
      tap((connectorAPI) => {
        logger.info(connectorAPI, 'Compatible wallet connector API found. Connecting.');
      }),
      take(1),
      timeout({
        first: 1_000,
        with: () =>
          throwError(() => {
            logger.error('Could not find wallet connector API');

            return new Error('Could not find Midnight Lace wallet. Extension installed?');
          }),
      }),
      concatMap(async (connectorAPI) => {
        const isEnabled = await (connectorAPI as any).isEnabled();

        logger.info(isEnabled, 'Wallet connector API enabled status');

        return connectorAPI;
      }),
      timeout({
        first: 5_000,
        with: () =>
          throwError(() => {
            logger.error('Wallet connector API has failed to respond');
            return new Error('Midnight Lace wallet has failed to respond. Extension enabled?');
          }),
      }),
      concatMap(async (connectorAPI) => {
        try {
          return {
            walletConnectorAPI: await (connectorAPI as any).enable(),
            connectorAPI,
          };
        } catch {
          logger.error('Unable to enable connector API');
          throw new Error('Application is not authorized');
        }
      }),
      concatMap(async ({ walletConnectorAPI, connectorAPI }) => {
        const uris = await (connectorAPI as any).serviceUriConfig();

        logger.info('Connected to wallet connector API and retrieved service configuration');

        return { wallet: walletConnectorAPI, uris };
      }),
    ),
  );
};
