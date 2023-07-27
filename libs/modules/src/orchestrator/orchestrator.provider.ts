import { ConfigName } from '@lib/core/config';
import { ConfigService } from '@nestjs/config';
import { Client, Connection, ConnectionOptions } from '@temporalio/client';
import { NativeConnection, NativeConnectionOptions } from '@temporalio/worker';
import { InjectTokens } from '../inject-tokens';

export const OrchestratorConnectionConfigProvider = {
  provide: InjectTokens.ORCHESTRATOR_CONNECTION_CONFIG,
  useFactory: (config: ConfigService) => {
    return {
      address: config.get(`${ConfigName.ORCHESTRATOR}.address`),
    } as ConnectionOptions;
  },
  inject: [ConfigService],
};

export const OrchestratorNativeConnectionConfigProvider = {
  provide: InjectTokens.ORCHESTRATOR_NATIVE_CONNECTION_CONFIG,
  useFactory: (config: ConfigService) => {
    return {
      address: config.get(`${ConfigName.ORCHESTRATOR}.address`),
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
  useFactory: (connection: Connection) => {
    return new Client({ connection });
  },
  inject: [InjectTokens.ORCHESTRATOR_CONNECTION],
};

export default [
  OrchestratorConnectionConfigProvider,
  OrchestratorNativeConnectionConfigProvider,
  OrchestratorConnectionProvider,
  OrchestratorNativeConnectionProvider,
  OrchestratorClientProvider,
];
