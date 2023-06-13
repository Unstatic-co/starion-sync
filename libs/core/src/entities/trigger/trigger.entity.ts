import { WorkflowId } from '../workflow';
import { TriggerConfig } from './trigger.config';

export enum TriggerType {
  MANUAL = 'MANUAL',
  SCHEDULE = 'SCHEDULE',
  EVENT = 'EVENT',
}

export class Trigger {
  workflowId: WorkflowId;
  type: TriggerType;
  config: TriggerConfig;
}
