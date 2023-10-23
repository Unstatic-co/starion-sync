import { registerAs } from '@nestjs/config';
import { ConfigName } from '.';

export interface OrchestratorConfig {
  address: string;
  workerTaskQueue: string;
  defaultTaskQueue: string;
}

export const orchestratorConfig: OrchestratorConfig = {
  address: process.env.ORCHESTRATOR_ADDRESS || 'localhost:7233',
  workerTaskQueue: process.env.ORCHESTRATOR_WORKER_TASKQUEUE || 'default',
  defaultTaskQueue: process.env.ORCHESTRATOR_DEFAULT_TASKQUEUE || 'default',
};

export const orchestratorConfigRegister = registerAs(
  ConfigName.ORCHESTRATOR,
  () => {
    return orchestratorConfig;
  },
);
