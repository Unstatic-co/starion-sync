import {
  DataSourceId,
  ProviderId,
  ProviderType,
  SyncConnection,
  SyncConnectionId,
  Syncflow,
  WorkflowId,
  WorkflowName,
  WorkflowType,
} from '../entities';
import {
  Trigger,
  TriggerId,
  TriggerName,
  TriggerType,
} from '../entities/trigger';
import { ErrorCode, ErrorType } from '../error';
import { EventPayload } from './baseEvent';

export type DataProviderDeletedPayload = EventPayload & {
  providerId: ProviderId;
  providerType: ProviderType;
};

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
export type WorkflowTriggeredPayload = EventPayload &
  (
    | Trigger
    | {
        trigger: {
          id: TriggerId;
          type: TriggerType;
          name: TriggerName;
        };
        sourceId: DataSourceId;
        workflow: {
          id: WorkflowId;
          name: WorkflowName;
          type: WorkflowType;
        };
      }
  );
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
  syncflowId: string;
  syncVersion: number;
  rowsNumber: number;
};

export type SyncflowFailedPayload = EventPayload & {
  dataSourceId: string;
  syncflowId: string;
  syncVersion: number;
  error: {
    type: ErrorType;
    code: number;
    message: string;
  };
};
