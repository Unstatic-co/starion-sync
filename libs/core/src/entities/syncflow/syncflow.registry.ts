import { ProviderType } from '../data-source';
import { TriggerName } from '../trigger';
import { SyncflowAttributes } from './syncflow.attributes';
import { SyncflowName } from './syncflow.entity';

export type SyncflowRegistryRecord = {
  name: SyncflowName;
  attributes: SyncflowAttributes;
  triggerName: TriggerName;
};

const SYNCFLOWS = new Map<SyncflowName, SyncflowRegistryRecord>();

export class SyncflowRegistry {
  public static get(key: SyncflowName): SyncflowRegistryRecord {
    return SYNCFLOWS.get(key);
  }

  public static set(key: SyncflowName, data: SyncflowRegistryRecord): void {
    SYNCFLOWS.set(key, data);
  }
}

const PROVIDER_SYNCFLOWS = new Map<ProviderType, SyncflowName[]>();

export class ProviderSyncflowsRegistry {
  public static get(key: ProviderType): SyncflowName[] {
    return PROVIDER_SYNCFLOWS.get(key);
  }

  public static set(key: ProviderType, data: SyncflowName[]): void {
    PROVIDER_SYNCFLOWS.set(key, data);
  }
}
