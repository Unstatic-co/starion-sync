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
import { SyncflowName } from '../syncflow.entity';

const attributesBuilder = new SyncflowAttributesBuilder();

// Define syncflows

const MicrosoftExcelSyncflowDefinitions: Array<{
  name: SyncflowName;
  attributes: SyncflowAttributes;
  trigger: {
    name: TriggerName;
    type: TriggerType;
  };
}> = [
  // SYNCFLOW: FULL REFRESH
  {
    name: SyncflowNames.EXCEL_FULL,
    attributes: attributesBuilder
      .reset()
      .setDirection(SyncflowDirection.FORWARD)
      .setSyncMode(SyncflowMode.REFRESH)
      .setProviderType(ProviderType.MICROSOFT_EXCEL)
      .setSyncMethod(SyncflowSyncMethod.FULL)
      .setSyncTarget(SyncflowSyncTarget.FULL)
      .setSyncType(SyncflowSyncType.FULL)
      .build(),
    trigger: {
      name: TriggerNames.MIRCROSOFT_EXCEL_CRON,
      type: TriggerType.CRON,
    },
  },
];

// Register syncflows

MicrosoftExcelSyncflowDefinitions.forEach((definition) => {
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
  ProviderType.MICROSOFT_EXCEL,
  MicrosoftExcelSyncflowDefinitions.map((definition) => definition.name),
);
