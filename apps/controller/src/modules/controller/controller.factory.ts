import { DataSource, ProviderType, Syncflow } from '@lib/core';
import { Injectable } from '@nestjs/common';
import { MicrosoftExcelSyncflowController } from './microsoft-excel';
import { GoogleSheetsSyncflowController } from './google-sheets';

export interface SyncflowController {
  run(syncflow: Syncflow, dataSource: DataSource): Promise<void>;
}

@Injectable()
export class SyncflowControllerFactory {
  constructor(
    private readonly microsoftExcelSyncflowController: MicrosoftExcelSyncflowController,
    private readonly googleSheetsSyncflowController: GoogleSheetsSyncflowController,
  ) {}

  public get(providerType: ProviderType): SyncflowController {
    switch (providerType) {
      case ProviderType.GOOGLE_SHEETS:
        return this.googleSheetsSyncflowController;
      case ProviderType.MICROSOFT_EXCEL:
        return this.microsoftExcelSyncflowController;
      default:
        throw new Error('Unknown provider type');
    }
  }
}
