type TemporalWorkflow = (...args: any[]) => any;

export enum WorkflowStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class Workflow {
  private id: string;
  private name: string;
  private status: WorkflowStatus;
  private temporalWorflow: TemporalWorkflow;

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getStatus(): WorkflowStatus {
    return this.status;
  }
}
