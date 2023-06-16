import { Trigger } from '../trigger';
import { WorkflowType } from './workflow.type';

export type TemporalWorkflow = (...args: any[]) => any;

export type WorkflowId = string;

export type WorkflowName = string;

export enum WorkflowStatus {
  IDLING = 'IDLING',
  RUNNING = 'RUNNING',
}

export type WorkflowPayload = any;

export type WorkflowConfig = any;

export class Workflow {
  id: WorkflowId;
  type: WorkflowType;
  name: WorkflowName;
  status: WorkflowStatus;
  payload?: WorkflowPayload;
  config?: WorkflowConfig;
  trigger: Partial<Trigger>;

  createdAt: Date;
  updatedAt: Date;
  endedAt?: Date;
}
