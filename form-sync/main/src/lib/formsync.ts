import { FieldId, RecordId } from './schema';

export enum FormSyncType {
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
}

export type FormSyncPayload = {
  recordId?: RecordId;
  data?: Record<FieldId, any>;
};

export type InsertPayload = FormSyncPayload & {
  data: Record<FieldId, any>;
};

export type UpdatePayload = FormSyncPayload & {
  recordId: RecordId;
  data: Record<FieldId, any>;
};
