import { SyncflowState } from '../syncflow.entity';

export interface GoogleSheetsFullSyncState extends SyncflowState {
  downloadedAt?: Date;
  ingestedAt?: Date;
}
