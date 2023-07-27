import { ProviderType } from '../data-source';

export type SyncflowDataSourceProvider = ProviderType;

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

export class SyncflowAttributesBuilder {
  private attributes: SyncflowAttributes | Record<string, unknown>;

  constructor() {
    this.attributes = {};
  }

  reset() {
    this.attributes = {};
    return this;
  }

  setDirection(direction: SyncflowDirection) {
    this.attributes.direction = direction;
    return this;
  }

  setSyncMode(syncMode: SyncflowMode) {
    this.attributes.syncMode = syncMode;
    return this;
  }

  setProviderType(providerType: SyncflowDataSourceProvider) {
    this.attributes.providerType = providerType;
    return this;
  }

  setSyncMethod(syncMethod: SyncflowSyncMethod) {
    this.attributes.syncMethod = syncMethod;
    return this;
  }

  setSyncTarget(syncTarget: SyncflowSyncTarget) {
    this.attributes.syncTarget = syncTarget;
    return this;
  }

  setSyncType(syncType: SyncflowSyncType) {
    this.attributes.syncType = syncType;
    return this;
  }

  build(): SyncflowAttributes {
    return this.attributes as SyncflowAttributes;
  }
}
