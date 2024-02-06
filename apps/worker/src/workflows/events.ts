import { DataProvider, EventPayload, Syncflow } from '@lib/core';

export enum WorkflowEvents {
  GoogleSheetsDownload = 'workflow.googleSheetsFullSync.download',
  GoogleSheetsProceedSync = 'workflow.googleSheetsFullSync.proceed',
}

export type GoogleSheetsDownloadPayload = EventPayload & {
  provider: DataProvider;
  syncflow: Syncflow;
  version: number;
};

export type GoogleSheetsProceedSyncPayload = EventPayload & {
  syncflow: Syncflow;
  version: number;
};
