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

const GoogleSheetsSyncflowDefinitions: Array<{
  name: SyncflowName;
  attributes: SyncflowAttributes;
  trigger: {
    name: TriggerName;
    type: TriggerType;
  };
}> = [
  // SYNCFLOW: FULL REFRESH
  {
    name: SyncflowNames.GOOGLE_SHEETS_FULL,
    attributes: attributesBuilder
      .reset()
      .setDirection(SyncflowDirection.FORWARD)
      .setSyncMode(SyncflowMode.REFRESH)
      .setProviderType(ProviderType.GOOGLE_SHEETS)
      .setSyncMethod(SyncflowSyncMethod.FULL)
      .setSyncTarget(SyncflowSyncTarget.FULL)
      .setSyncType(SyncflowSyncType.FULL)
      .build(),
    trigger: {
      name: TriggerNames.GOOGLE_SHEETS_CRON,
      type: TriggerType.CRON,
    },
  },
];

// Define cursor types

export type GoogleSheetsFullSyncCursor = SyncflowCursor & { ctag: string };

// Register syncflows

GoogleSheetsSyncflowDefinitions.forEach((definition) => {
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
  ProviderType.GOOGLE_SHEETS,
  GoogleSheetsSyncflowDefinitions.map((definition) => definition.name),
);
