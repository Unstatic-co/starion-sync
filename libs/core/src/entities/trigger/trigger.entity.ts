import { DataSourceId } from '../data-source';
import { WorkflowId, WorkflowName } from '../workflow';
import { WorkflowType } from '../workflow/workflow.type';
import { TriggerConfig } from './trigger.config';

export type TriggerId = string;

export type TriggerName = string;

export enum TriggerType {
  MANUAL = 'MANUAL',
  SCHEDULE = 'SCHEDULE',
  CRON = 'CRON',
  EVENT_WEBHOOK = 'EVENT_WEBHOOK',
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
  sourceId: DataSourceId;
  config?: TriggerConfig;
}

export class SyncTrigger extends Trigger {}

export const DEFAULT_CRON_TRIGGER_FREQUENCY = 4; // minutes
