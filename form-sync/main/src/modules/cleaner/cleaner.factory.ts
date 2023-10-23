import { Injectable } from '@nestjs/common';
import { GoogleSheetsCleanerService } from './google-sheets';
import { ProviderType } from 'src/lib/provider';
import { ExcelCleanerService } from './excel';

export interface Cleaner {
  run(dataSourceId: string): Promise<void>;
}

@Injectable()
export class CleanerFactory {
  constructor(
    private readonly microsoftExcelCleaner: ExcelCleanerService,
    private readonly googleSheetsCleaner: GoogleSheetsCleanerService,
  ) {}

  public get(providerType: ProviderType): Cleaner {
    switch (providerType) {
      case ProviderType.MicrosoftExcel:
        return this.microsoftExcelCleaner;
      case ProviderType.GoogleSheets:
        return this.googleSheetsCleaner;
      default:
        throw new Error('Unknown provider type');
    }
  }
}
