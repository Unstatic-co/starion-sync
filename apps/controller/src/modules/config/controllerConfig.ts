import { ConfigName } from '@lib/core/config';
import { registerAs } from '@nestjs/config';

export interface ControllerConfig {
  ignoreWorkflowTriggered: boolean;
}

export const controllerConfigRegister = registerAs(
  ConfigName.CONTROLLER,
  () => {
    return {
      ignoreWorkflowTriggered: process.env.IGNORE_WORKFLOW_TRIGGERED === 'true',
    } as ControllerConfig;
  },
);
