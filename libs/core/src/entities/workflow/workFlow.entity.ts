import { Trigger } from '../trigger';
import { WorkflowType } from './workflow.type';

export type TemporalWorkflow = (...args: any[]) => any;

export type WorkflowId = string;

export type WorkflowName = string;

export enum WorkflowStatus {
  IDLING = 'IDLING',
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
}

export type WorkflowState = {
  status: WorkflowStatus;
};

export type WorkflowPayload = any;

export type WorkflowConfig = any;

export class Workflow {
  id: WorkflowId;
  type: WorkflowType;
  name: WorkflowName;
  state: WorkflowState;
  payload?: WorkflowPayload;
  config?: WorkflowConfig;
  trigger: Partial<Trigger>;

  createdAt: Date;
  updatedAt: Date;
  endedAt?: Date;
}
