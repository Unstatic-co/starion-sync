import { Workflow } from '../workflow/workFlow.entity';

export enum SyncflowStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class Syncflow {
  private id: string;
  private name: string;
  private status: SyncflowStatus;
  private workFlow: Workflow;
  createdAt: Date;
  updatedAt: Date;

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getStatus(): SyncflowStatus {
    return this.status;
  }
}
