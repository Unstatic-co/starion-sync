import { registerAs } from '@nestjs/config';
import { ConfigName } from './config.enum';

export interface OrchestratorConfig {
    address: string;
}

export const orchestratorConfig: OrchestratorConfig = {
    address: process.env.ORCHESTRATOR_ADDRESS || 'localhost:7233',
};

export const orchestratorConfigRegister = registerAs(ConfigName.ORCHESTRATOR, () => {
    return orchestratorConfig;
});
