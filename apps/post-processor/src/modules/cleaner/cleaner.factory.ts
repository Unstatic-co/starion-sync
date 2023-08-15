import { ProviderConfig, ProviderId, ProviderType, Workflow } from '@lib/core';
import { Injectable } from '@nestjs/common';
import { MicrosoftExcelCleanerService } from './excel';

export interface WorkflowCleaner {
  run(providerConfig: Workflow): Promise<void>;
}

@Injectable()
export class CleanerFactory {
  constructor(
    private readonly microsoftExcelCleaner: MicrosoftExcelCleanerService,
  ) {}

  public get(providerType: ProviderType): WorkflowCleaner {
    switch (providerType) {
      case ProviderType.MICROSOFT_EXCEL:
        return this.microsoftExcelCleaner;
      default:
        throw new Error('Unknown provider type');
    }
  }
}
