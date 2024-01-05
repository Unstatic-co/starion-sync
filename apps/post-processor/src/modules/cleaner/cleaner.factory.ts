import { ProviderId, ProviderType, Workflow } from '@lib/core';
import { Injectable } from '@nestjs/common';
import { MicrosoftExcelDataProviderCleaner, MicrosoftExcelWorkflowCleaner } from './excel';
import { GoogleSheetsDataProviderCleaner, GoogleSheetsWorkflowCleaner } from './google-sheets';

export interface WorkflowCleaner {
  run(
    providerConfig: Workflow,
    additionalData: {
      syncVersion: number;
      prevSyncVersion: number;
    },
  ): Promise<void>;
}

export interface DataProviderCleaner {
  run(
    providerId: ProviderId
  ): Promise<void>;
}

@Injectable()
export class CleanerFactory {
  constructor(
    private readonly microsoftExcelWorkflowCleaner: MicrosoftExcelWorkflowCleaner,
    private readonly googleSheetsWorkflowCleaner: GoogleSheetsWorkflowCleaner,
    private readonly googleSheetsDataProviderCleaner: GoogleSheetsDataProviderCleaner,
    private readonly microsoftExcelDataProviderCleaner: MicrosoftExcelDataProviderCleaner,
  ) { }

  public getWorkflowCleaner(providerType: ProviderType): WorkflowCleaner {
    switch (providerType) {
      case ProviderType.MICROSOFT_EXCEL:
        return this.microsoftExcelWorkflowCleaner;
      case ProviderType.GOOGLE_SHEETS:
        return this.googleSheetsWorkflowCleaner;
      default:
        throw new Error('Unknown provider type');
    }
  }

  public getDataProviderCleaner(providerType: ProviderType): DataProviderCleaner {
    switch (providerType) {
      case ProviderType.GOOGLE_SHEETS:
        return this.googleSheetsDataProviderCleaner;
      case ProviderType.MICROSOFT_EXCEL:
        return this.googleSheetsDataProviderCleaner;
      default:
        throw new Error(`Unknow provider cleaner for ${providerType}`);
    }
  }
}
