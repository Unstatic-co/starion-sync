export type TemporalWorkflow = (...args: any[]) => any;

export type WorkflowId = String

export enum WorkflowStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class Workflow {
  private id: WorkflowId;
  private name: string;
  private status: WorkflowStatus;
  private temporalWorflow: TemporalWorkflow;

  public getId(): WorkflowId {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getStatus(): WorkflowStatus {
    return this.status;
  }
}
