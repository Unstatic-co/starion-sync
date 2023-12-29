import { ProviderType } from '@lib/core';
import { GoogleSheetsDiscoverer } from './google-sheets/googleSheets.discoverer';
import { Injectable } from '@nestjs/common';
import { MicrosoftExcelDiscoverer } from './microsoft-excel/microsoftExcel.discover';
import { DataDiscoverer } from './discoverer.interface';
@Injectable()
export class DataDiscovererFactory {
  constructor(
    private readonly googleSheetsDiscoverer: GoogleSheetsDiscoverer,
    private readonly microsoftExcelDiscoverer: MicrosoftExcelDiscoverer,
  ) {}

  public get(providerType: ProviderType): DataDiscoverer {
    switch (providerType) {
      case ProviderType.GOOGLE_SHEETS:
        return this.googleSheetsDiscoverer;
      case ProviderType.MICROSOFT_EXCEL:
        return this.microsoftExcelDiscoverer;
      default:
        throw new Error('Unknown provider type');
    }
  }
}
