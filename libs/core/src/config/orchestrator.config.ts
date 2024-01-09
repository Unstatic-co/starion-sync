import { registerAs } from '@nestjs/config';
import { ConfigName } from './config.enum';

export interface OrchestratorConfig {
  address: string;
  namespace: string;
  workerTaskQueue: string;
  defaultTaskQueue: string;
  clientCert: string;
  clientKey: string;
}

export const orchestratorConfig: OrchestratorConfig = {
  address: process.env.ORCHESTRATOR_ADDRESS || 'localhost:7233',
  namespace: process.env.ORCHESTRATOR_NAMESPACE || 'default',
  workerTaskQueue: process.env.ORCHESTRATOR_WORKER_TASKQUEUE || 'default',
  defaultTaskQueue: process.env.ORCHESTRATOR_DEFAULT_TASKQUEUE || 'default',
  clientCert: process.env.ORCHESTRATOR_CLIENT_CERT || '',
  clientKey: process.env.ORCHESTRATOR_CLIENT_KEY || '',
};

export const orchestratorConfigRegister = registerAs(
  ConfigName.ORCHESTRATOR,
  () => {
    return orchestratorConfig;
  },
);
