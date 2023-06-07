import { ConfigName } from '@lib/core/config';
import { ConfigService } from '@nestjs/config';
import { Client, Connection, ConnectionOptions } from '@temporalio/client';

export const ORCHESTRATOR_CONNECTION_CONFIG = 'ORCHESTRATOR_CONNECTION_CONFIG';
export const ORCHESTRATOR_CONNECTION = 'ORCHESTRATOR_CONNECTION';
export const ORCHESTRATOR_CLIENT = 'ORCHESTRATOR_CLIENT';

export const OrchestratorProviders = [
  {
    provide: ORCHESTRATOR_CONNECTION_CONFIG,
    useFactory: (config: ConfigService) => {
      return {
        address: config.get(`${ConfigName.ORCHESTRATOR}.address`),
      } as ConnectionOptions;
    },
    inject: [ConfigService],
  },
  {
    provide: ORCHESTRATOR_CONNECTION,
    useFactory: async (config: ConnectionOptions) => {
      const connection = await Connection.connect(config);
      return connection;
    },
    inject: [ORCHESTRATOR_CONNECTION_CONFIG],
  },
  {
    provide: ORCHESTRATOR_CLIENT,
    useFactory: (connection: Connection) => {
      return new Client({ connection });
    },
    inject: [ORCHESTRATOR_CONNECTION],
  },
] as any[];
