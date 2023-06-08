import { WorkflowId } from '../workflow';

export enum TriggerType {
  MANUAL = 'MANUAL',
  SCHEDULE = 'SCHEDULE',
  EVENT = 'EVENT',
}

export class Trigger {
  workflowId: WorkflowId;
  type: TriggerType;
}
