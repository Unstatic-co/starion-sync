export enum WorkflowExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export type WorkflowExecutionPayload = any;
export type WorkflowExecutionConfig = any;

export class WorkflowExecution {
  workflowId: string;
  status: WorkflowExecutionStatus;
  payload?: any;
  config?: any;

  createdAt: Date;
  updatedAt: Date;
  endedAt?: Date;
}
