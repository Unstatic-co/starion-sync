import {
  DataSourceId,
  SyncConnection,
  SyncConnectionId,
  Syncflow,
  Workflow,
} from '../entities';
import { Trigger } from '../entities/trigger';
import { EventPayload } from './baseEvent';

export type DataSourceDeletedPayload = EventPayload & {
  dataSourceId: DataSourceId;
  syncConnectionId?: SyncConnectionId;
};

export type ConnectionCreatedPayload = EventPayload & SyncConnection;
export type ConnectionDeletedPayload = EventPayload & SyncConnection;
export type WorkflowTriggeredPayload = EventPayload & Trigger;
export type SyncflowScheduledPayload = EventPayload & {
  syncflow: Syncflow;
  version: number;
};
export type SyncflowSucceedPayload = EventPayload & {
  dataSourceId: string;
  syncflowId: string;
  syncVersion: number;
  prevSyncVersion: number;
  loadedDataStatistics: {
    addedRowsCount: number;
    deletedRowsCount: number;
  };
};
export type SyncflowCompletedPayload = EventPayload & {
  dataSourceId: string;
  syncflowId: string;
  rowsNumber: number;
};
