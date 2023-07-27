import { DataSourceId } from '../data-source';
import { Trigger } from '../trigger';
import {
  Workflow,
  WorkflowId,
  WorkflowName,
  WorkflowState,
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

export interface SyncflowState extends WorkflowState {
  status: SyncflowStatus;
  version: SyncflowVersion;
  prevVersion: SyncflowVersion;
  cursor?: SyncflowCursor;
}

export class Syncflow extends Workflow {
  id: SyncflowId;
  name: SyncflowName; // type
  attributes: SyncflowAttributes; // type
  sourceId: DataSourceId;
  state: SyncflowState;
  config: SyncflowConfig;
  trigger: Partial<Trigger>;

  createdAt: Date;
  updatedAt: Date;
}

export const defaultSyncflowState: SyncflowState = {
  status: WorkflowStatus.IDLING,
  version: 0,
  prevVersion: 0,
};
