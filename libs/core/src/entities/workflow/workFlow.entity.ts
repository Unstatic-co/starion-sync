import { WorkflowAttributes } from './workflow.atrributes';

export type TemporalWorkflow = (...args: any[]) => any;

export type WorkflowId = string;

export enum WorkflowStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class Workflow {
  id: WorkflowId;
  name: string;
  attributes: WorkflowAttributes;
}
