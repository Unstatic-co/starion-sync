import { WorkflowId, WorkflowName } from '../workflow';
import { WorkflowType } from '../workflow/workflow.type';
import { TriggerConfig } from './trigger.config';

export type TriggerId = string;

export type TriggerName = string;

export enum TriggerType {
  MANUAL = 'MANUAL',
  SCHEDULE = 'SCHEDULE',
  CRON = 'CRON',
  EVENT = 'EVENT',
}

export class Trigger {
  id: TriggerId;
  name: TriggerName; // type
  type: TriggerType;
  workflow: {
    id: WorkflowId;
    name: WorkflowName;
    type: WorkflowType;
  };
  config?: TriggerConfig;
}

export class SyncTrigger extends Trigger {}
