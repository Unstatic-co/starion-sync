import { Injectable, Logger } from '@nestjs/common';
import { DataDiscoverer } from '../data-discoverer.factory';
import { GoogleService, GoogleSheetsService } from '@lib/modules/third-party';
import { DiscoveredGoogleSheetsDataSource } from '../discoverer.interface';
import {
  ERROR_CODE,
  ExternalError,
  GoogleSheetsDataSourceConfig,
  GoogleSheetsProviderConfig,
} from '@lib/core';

@Injectable()
export class GoogleSheetsDiscoverer implements DataDiscoverer {
  private readonly logger = new Logger(GoogleSheetsDiscoverer.name);

  constructor(
    private readonly googleService: GoogleService,
    private readonly googleSheetsService: GoogleSheetsService,
  ) {}

  public async checkDataSource(
    config: GoogleSheetsDataSourceConfig,
  ): Promise<void> {
    const { auth, sheetId } = config;
    const [, sheets] = await Promise.all([
      this.googleService.validateToken(auth?.refreshToken),
      this.discoverProvider(config),
    ]);

    const sheet = sheets.find(
      (discoveredSheet) => discoveredSheet.id === sheetId,
    );
    if (!sheet) {
      throw new ExternalError(
        ERROR_CODE.SHEET_NOT_FOUND,
        "Sheet doesn't exist",
      );
    }

    await this.checkEmpty(sheet.title, config);
  }

  public async discoverProvider(
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

  async checkEmpty(sheetName: string, config: GoogleSheetsDataSourceConfig) {
    let isEmpty = false;
    const { auth, spreadsheetId } = config;
    const client = await this.googleSheetsService.createSheetsClient(
      auth.refreshToken,
    );
    const headerRangeValues = await this.googleSheetsService.getRangeValue({
      client,
      spreadsheetId,
      range: `${sheetName}!A1:Z1`,
    });
    if (!headerRangeValues.length) {
      isEmpty = true;
    } else {
      let headerValuesCount = 0;
      const headerValues = headerRangeValues[0];
      this.logger.debug(`Header values: ${headerValues}`);
      headerValues.forEach((value) => {
        if (value !== '') {
          headerValuesCount++;
        }
      });
      if (!headerValues.length || headerValuesCount === 0) {
        isEmpty = true;
      }
    }

    if (isEmpty) {
      throw new ExternalError(
        ERROR_CODE.SHEET_EMPTY,
        "Sheet doesn't have any data",
      );
    }
  }
}
