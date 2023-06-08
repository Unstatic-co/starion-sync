import { ProviderType } from '../data-source';

type SyncflowDataSourceProvider = ProviderType;

export enum SyncflowDirection {
  FORWARD = 'forward',
  BACKWARD = 'backward',
}

export enum SyncflowMode {
  REFRESH = 'refresh',
  INCREMENTAL = 'incremental',
}

export enum SyncflowSyncMethod {
  FULL = 'full',
  PARTIAL = 'partial',
  MICRO = 'micro',
}

export enum SyncflowSyncTarget {
  DATA = 'data',
  SCHEMA = 'schema',
  FULL = 'full', // both schema and data
}

export enum SyncflowSyncType {
  FULL = 'full',
  SCHEMA = 'schema',
  DATA_FULL = 'data-full',
  DATA_PARTIAL = 'data-partial',
  DATA_MICRO = 'data-micro',
}

export type SyncflowAttributes = {
  direction: SyncflowDirection;
  syncMode: SyncflowMode;
  providerType: SyncflowDataSourceProvider;
  syncMethod: SyncflowSyncMethod;
  syncTarget: SyncflowSyncTarget;
  syncType: SyncflowSyncType;
};
