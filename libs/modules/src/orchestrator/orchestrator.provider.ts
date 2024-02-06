import { ConfigName } from '@lib/core/config';
import { ConfigService } from '@nestjs/config';
import { Client, Connection, ConnectionOptions } from '@temporalio/client';
import { NativeConnection, NativeConnectionOptions } from '@temporalio/worker';
import { InjectTokens } from '../inject-tokens';

export const OrchestratorConnectionConfigProvider = {
  provide: InjectTokens.ORCHESTRATOR_CONNECTION_CONFIG,
  useFactory: (config: ConfigService) => {
    const tlsEnabled = config.get<boolean>(
      `${ConfigName.ORCHESTRATOR}.tlsEnabled`,
    );
    const cert = Buffer.from(
      config.get<string>(`${ConfigName.ORCHESTRATOR}.clientCert`),
      'base64',
    );
    const key = Buffer.from(
      config.get<string>(`${ConfigName.ORCHESTRATOR}.clientKey`),
      'base64',
    );
    return {
      address: config.get(`${ConfigName.ORCHESTRATOR}.address`),
      tls: tlsEnabled
        ? {
            clientCertPair: {
              crt: cert,
              key,
            },
          }
        : false,
      connectTimeout: 10000,
    } as ConnectionOptions;
  },
  inject: [ConfigService],
};

export const OrchestratorNativeConnectionConfigProvider = {
  provide: InjectTokens.ORCHESTRATOR_NATIVE_CONNECTION_CONFIG,
  useFactory: (config: ConfigService) => {
    const tlsEnabled = config.get<boolean>(
      `${ConfigName.ORCHESTRATOR}.tlsEnabled`,
    );
    const cert = Buffer.from(
      config.get<string>(`${ConfigName.ORCHESTRATOR}.clientCert`),
      'base64',
    );
    const key = Buffer.from(
      config.get<string>(`${ConfigName.ORCHESTRATOR}.clientKey`),
      'base64',
    );
    return {
      address: config.get(`${ConfigName.ORCHESTRATOR}.address`),
      tls: tlsEnabled
        ? {
            clientCertPair: {
              crt: cert,
              key,
            },
          }
        : false,
      connectTimeout: 10000,
    } as ConnectionOptions;
  },
  inject: [ConfigService],
};

export const OrchestratorConnectionProvider = {
  provide: InjectTokens.ORCHESTRATOR_CONNECTION,
  useFactory: async (config: ConnectionOptions) => {
    const connection = await Connection.connect(config);
    return connection;
  },
  inject: [InjectTokens.ORCHESTRATOR_CONNECTION_CONFIG],
};

export const OrchestratorNativeConnectionProvider = {
  provide: InjectTokens.ORCHESTRATOR_NATIVE_CONNECTION,
  useFactory: async (config: NativeConnectionOptions) => {
    const nativeConnection = await NativeConnection.connect(config);
    return nativeConnection;
  },
  inject: [InjectTokens.ORCHESTRATOR_NATIVE_CONNECTION_CONFIG],
};

export const OrchestratorClientProvider = {
  provide: InjectTokens.ORCHESTRATOR_CLIENT,
  useFactory: (connection: Connection, config: ConfigService) => {
    const namespace = config.get<string>(
      `${ConfigName.ORCHESTRATOR}.namespace`,
    );
    return new Client({
      connection,
      namespace,
      dataConverter: {
        payloadConverterPath: require.resolve('./payload-converter'),
      },
    });
  },
  inject: [InjectTokens.ORCHESTRATOR_CONNECTION, ConfigService],
};

export default [
  OrchestratorConnectionConfigProvider,
  OrchestratorNativeConnectionConfigProvider,
  OrchestratorConnectionProvider,
  OrchestratorNativeConnectionProvider,
  OrchestratorClientProvider,
];
