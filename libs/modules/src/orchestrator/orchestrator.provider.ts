import { ConfigName } from '@lib/core/config';
import { ConfigService } from '@nestjs/config';
import { Client, Connection, ConnectionOptions } from '@temporalio/client';
import { NativeConnection, NativeConnectionOptions } from '@temporalio/worker';

export const ORCHESTRATOR_CONNECTION_CONFIG = 'ORCHESTRATOR_CONNECTION_CONFIG';
export const ORCHESTRATOR_NATIVE_CONNECTION_CONFIG =
  'ORCHESTRATOR_NATIVE_CONNECTION_CONFIG';
export const ORCHESTRATOR_CONNECTION = 'ORCHESTRATOR_CONNECTION';
export const ORCHESTRATOR_NATIVE_CONNECTION = 'ORCHESTRATOR_NATIVE_CONNECTION';
export const ORCHESTRATOR_CLIENT = 'ORCHESTRATOR_CLIENT';

export const OrchestratorConnectionConfigProvider = {
  provide: ORCHESTRATOR_CONNECTION_CONFIG,
  useFactory: (config: ConfigService) => {
    return {
      address: config.get(`${ConfigName.ORCHESTRATOR}.address`),
    } as ConnectionOptions;
  },
  inject: [ConfigService],
};

export const OrchestratorNativeConnectionConfigProvider = {
  provide: ORCHESTRATOR_NATIVE_CONNECTION_CONFIG,
  useFactory: (config: ConfigService) => {
    return {
      address: config.get(`${ConfigName.ORCHESTRATOR}.address`),
    } as ConnectionOptions;
  },
  inject: [ConfigService],
};

export const OrchestratorConnectionProvider = {
  provide: ORCHESTRATOR_CONNECTION,
  useFactory: async (config: ConnectionOptions) => {
    const connection = await Connection.connect(config);
    return connection;
  },
  inject: [ORCHESTRATOR_CONNECTION_CONFIG],
};

export const OrchestratorNativeConnectionProvider = {
  provide: ORCHESTRATOR_NATIVE_CONNECTION,
  useFactory: async (config: NativeConnectionOptions) => {
    const nativeConnection = await NativeConnection.connect(config);
    return nativeConnection;
  },
  inject: [ORCHESTRATOR_NATIVE_CONNECTION_CONFIG],
};

export const OrchestratorClientProvider = {
  provide: ORCHESTRATOR_CLIENT,
  useFactory: (connection: Connection) => {
    return new Client({ connection });
  },
  inject: [ORCHESTRATOR_CONNECTION],
};

export default [
  OrchestratorConnectionConfigProvider,
  OrchestratorNativeConnectionConfigProvider,
  OrchestratorConnectionProvider,
  OrchestratorNativeConnectionProvider,
  OrchestratorClientProvider,
];
