import { ProviderType } from '../data-source';

export enum WorkflowDirection {
  FORWARD = 'forward',
  BACKWARD = 'backward',
}

type WorkflowDataSourceProvider = ProviderType;

export enum WorkflowSyncMethod {
  FULL = 'full',
  PARTIAL = 'partial',
  MICRO = 'micro',
}

export enum WorkflowSyncTarget {
  DATA = 'data',
  SCHEMA = 'schema',
  FULL = 'full', // both schema and data
}

export enum WorkflowSyncType {
  FULL = 'full',
  SCHEMA = 'schema',
  DATA_FULL = 'data-full',
  DATA_PARTIAL = 'data-partial',
  DATA_MICRO = 'data-micro',
}

export type WorkflowAttributes = {
  direction: WorkflowDirection;
  providerType: WorkflowDataSourceProvider;
  syncMethod: WorkflowSyncMethod;
  syncTarget: WorkflowSyncTarget;
  syncType: WorkflowSyncType;
};
