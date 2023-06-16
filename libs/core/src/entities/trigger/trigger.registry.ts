import { TriggerName, TriggerType } from './trigger.entity';

export type TriggerRegistryRecord = {
  name: TriggerName;
  type: TriggerType;
};

const TRIGGERS = new Map<TriggerName, TriggerRegistryRecord>();

export class TriggerRegistry {
  public static get(key: TriggerName): TriggerRegistryRecord {
    return TRIGGERS.get(key);
  }

  public static set(key: TriggerName, data: TriggerRegistryRecord): void {
    TRIGGERS.set(key, data);
  }
}
