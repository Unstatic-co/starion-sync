import {
  SyncflowAttributes,
  SyncflowAttributesBuilder,
  SyncflowDirection,
  SyncflowMode,
  SyncflowSyncMethod,
  SyncflowSyncTarget,
  SyncflowSyncType,
} from '../syncflow.attributes';
import { ProviderType } from '../../data-source';
import {
  ProviderSyncflowsRegistry,
  SyncflowRegistry,
} from '../syncflow.registry';
import { SyncflowNames } from '../syncflowNames';
import {
  TriggerName,
  TriggerNames,
  TriggerRegistry,
  TriggerType,
} from '../../trigger';
import { SyncflowCursor, SyncflowName } from '../syncflow.entity';

const attributesBuilder = new SyncflowAttributesBuilder();

// Define syncflows

const AirTableSyncflowDefinitions: Array<{
  name: SyncflowName;
  attributes: SyncflowAttributes;
  trigger: {
    name: TriggerName;
    type: TriggerType;
  };
}> = [
  // SYNCFLOW: INITIAL FULL
  {
    name: SyncflowNames.AIR_TABLE_INITIAL,
    attributes: attributesBuilder
      .reset()
      .setDirection(SyncflowDirection.FORWARD)
      .setSyncMode(SyncflowMode.REFRESH)
      .setProviderType(ProviderType.AIR_TABLE)
      .setSyncMethod(SyncflowSyncMethod.FULL)
      .setSyncTarget(SyncflowSyncTarget.FULL)
      .setSyncType(SyncflowSyncType.FULL)
      .build(),
    trigger: {
      name: TriggerNames.MANUAL,
      type: TriggerType.MANUAL,
    },
  },
  // SYNCFLOW: INCREMENTAL
  {
    name: SyncflowNames.AIR_TABLE_INCREMENTAL,
    attributes: attributesBuilder
      .reset()
      .setDirection(SyncflowDirection.FORWARD)
      .setSyncMode(SyncflowMode.INCREMENTAL)
      .setProviderType(ProviderType.AIR_TABLE)
      .setSyncMethod(SyncflowSyncMethod.PARTIAL)
      .setSyncTarget(SyncflowSyncTarget.FULL)
      .setSyncType(SyncflowSyncType.FULL_PARTIAL)
      .build(),
    trigger: {
      name: TriggerNames.AIR_TABLE_WEBHOOK,
      type: TriggerType.EVENT_WEBHOOK,
    },
  },
];

// Define cursor types

export type AirTableFullSyncCursor = SyncflowCursor;

// Register syncflows

AirTableSyncflowDefinitions.forEach((definition) => {
  TriggerRegistry.set(definition.trigger.name, {
    name: definition.trigger.name,
    type: definition.trigger.type,
  });
  SyncflowRegistry.set(definition.name, {
    name: definition.name,
    attributes: definition.attributes,
    triggerName: definition.trigger.name,
  });
});

ProviderSyncflowsRegistry.set(
  ProviderType.AIR_TABLE,
  AirTableSyncflowDefinitions.map((definition) => definition.name),
);
