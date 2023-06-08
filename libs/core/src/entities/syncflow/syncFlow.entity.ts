import { Trigger } from '../trigger';
import {
  Workflow,
  WorkflowId,
  WorkflowName,
  WorkflowStatus,
} from '../workflow/workFlow.entity';
import { SyncflowAttributes } from './syncflow.attributes';
import { SyncflowConfig } from './syncflow.config';

export type SyncflowId = WorkflowId;

export type SyncflowName = WorkflowName;

export type SyncflowStatus = WorkflowStatus;

export type SyncflowPayload = any;

export type SyncflowVersion = number;

export type SyncflowCursor = any;

export type SyncflowState = {
  status: SyncflowStatus;
  version: SyncflowVersion;
  cursor?: SyncflowCursor;
};

export class Syncflow extends Workflow {
  id: SyncflowId;
  name: SyncflowName;
  state: SyncflowState;
  attributes: SyncflowAttributes;
  config: SyncflowConfig;
  trigger: Partial<Trigger>;

  createdAt: Date;
  updatedAt: Date;
}
