import { Injectable, Logger } from '@nestjs/common';
import { DataDiscoverer } from '../data-discoverer.factory';
import { GoogleService, GoogleSheetsService } from '@lib/modules/third-party';
import { DiscoveredGoogleSheetsDataSource } from '../discoverer.interface';
import { GoogleSheetsProviderConfig } from '@lib/core';

@Injectable()
export class GoogleSheetsDiscoverer implements DataDiscoverer {
  private readonly logger = new Logger(GoogleSheetsDiscoverer.name);

  constructor(
    private readonly googleService: GoogleService,
    private readonly googleSheetsService: GoogleSheetsService,
  ) {}

  public async check(config: GoogleSheetsProviderConfig): Promise<void> {
    const client = await this.googleService.createAuthClient(
      config.auth.refreshToken,
    );
    await this.googleSheetsService.getSpreadSheets({
      client,
      spreadsheetId: config.spreadsheetId,
      fields: ['spreadsheetId'],
    });
  }

  public async discover(
    config: GoogleSheetsProviderConfig,
  ): Promise<DiscoveredGoogleSheetsDataSource[]> {
    const client = await this.googleService.createAuthClient(
      config.auth.refreshToken,
    );
    const data = await this.googleSheetsService
      .getSpreadSheets({
        client,
        spreadsheetId: config.spreadsheetId,
        fields: ['sheets.properties'],
      })
      .then((res) =>
        res.sheets.map((sheet) => ({
          ...sheet.properties,
          id: `${sheet.properties.sheetId}`,
        })),
      );

    return data as DiscoveredGoogleSheetsDataSource[];
  }
}
