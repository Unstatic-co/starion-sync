import {
  DataSourceId,
  SyncConnection,
  SyncConnectionId,
  Syncflow,
} from '../entities';
import { Trigger } from '../entities/trigger';
import { ErrorCode } from '../error';
import { EventPayload } from './baseEvent';

export type DataSourceDeletedPayload = EventPayload & {
  dataSourceId: DataSourceId;
  syncConnectionId?: SyncConnectionId;
};

export type DataSourceErrorPayload = EventPayload & {
  dataSourceId: DataSourceId;
  code: ErrorCode;
  message: string;
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
  statistics: {
    addedRowsCount: number;
    deletedRowsCount: number;
    isSchemaChanged: boolean;
  };
};
export type SyncflowCompletedPayload = EventPayload & {
  dataSourceId: string;
  syncVersion: number;
  syncflowId: string;
  rowsNumber: number;
};
