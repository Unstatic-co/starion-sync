import { ProviderConfig, ProviderId, ProviderType, Workflow } from '@lib/core';
import { Injectable } from '@nestjs/common';
import { MicrosoftExcelCleanerService } from './excel';
import { GoogleSheetsCleanerService } from './google-sheets';

export interface WorkflowCleaner {
  run(
    providerConfig: Workflow,
    additionalData: {
      syncVersion: number;
      prevSyncVersion: number;
    },
  ): Promise<void>;
}

@Injectable()
export class CleanerFactory {
  constructor(
    private readonly microsoftExcelCleaner: MicrosoftExcelCleanerService,
    private readonly googleSheetsCleaner: GoogleSheetsCleanerService,
  ) {}

  public get(providerType: ProviderType): WorkflowCleaner {
    switch (providerType) {
      case ProviderType.MICROSOFT_EXCEL:
        return this.microsoftExcelCleaner;
      case ProviderType.GOOGLE_SHEETS:
        return this.googleSheetsCleaner;
      default:
        throw new Error('Unknown provider type');
    }
  }
}
