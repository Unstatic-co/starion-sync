import { Injectable, Logger } from '@nestjs/common';
import { DataDiscoverer } from '../data-discoverer.factory';
import {
  MicrosoftGraphService,
  MicrosoftService,
} from '@lib/modules/third-party';
import { DiscoveredExcelDataSource } from '../discoverer.interface';
import {
  ERROR_CODE,
  ExcelDataSourceConfig,
  ExcelProviderConfig,
  ExternalError,
} from '@lib/core';
import { Client } from '@microsoft/microsoft-graph-client';

@Injectable()
export class MicrosoftExcelDiscoverer implements DataDiscoverer {
  private readonly logger = new Logger(MicrosoftExcelDiscoverer.name);

  constructor(
    private readonly microsoftService: MicrosoftService,
    private readonly microsoftGraphService: MicrosoftGraphService,
  ) {}

  public async checkDataSource(config: ExcelDataSourceConfig): Promise<void> {
    const { auth, workbookId, worksheetId } = config;
    const accessToken = await this.microsoftService.getAccessToken(
      auth.refreshToken,
    );
    const client = await this.microsoftGraphService.createClient(accessToken);
    const sessionId = await this.microsoftGraphService.createWorkbookSession(
      client,
      workbookId,
      false,
    );
    const [, worksheets] = await Promise.all([
      this.microsoftGraphService.getWorkbookFileInfo({
        client,
        workbookId: config.workbookId,
        workbookSessionId: sessionId,
        select: [''],
      }),
      // this.checkEmpty(client, sessionId, config),
      this.microsoftGraphService.listWorksheets(client, workbookId, sessionId),
    ]);

    const worksheet = worksheets.find(
      (discoveredWorksheet) => discoveredWorksheet.id === worksheetId,
    );
    if (!worksheet) {
      throw new ExternalError(
        ERROR_CODE.WORKSHEET_NOT_FOUND,
        "Worksheet doesn't exist",
      );
    }
  }

  public async discoverProvider(
    config: ExcelProviderConfig,
  ): Promise<DiscoveredExcelDataSource[]> {
    const accessToken = await this.microsoftService.getAccessToken(
      config.auth.refreshToken,
    );
    const client = await this.microsoftGraphService.createClient(accessToken);
    return await this.microsoftGraphService.listWorksheets(
      client,
      config.workbookId,
    );
  }

  async checkEmpty(
    client: Client,
    sessionId: string,
    config: ExcelDataSourceConfig,
  ) {
    const { workbookId, worksheetId } = config;
    let isEmpty = false;

    const headerValues = await this.microsoftGraphService.getWorksheetRowValues(
      {
        client,
        workbookId,
        worksheetId,
        row: 0,
        workbookSessionId: sessionId,
      },
    );
    this.logger.debug(`headerValues: ${headerValues}`);

    if (!headerValues.length) {
      isEmpty = true;
    } else {
      let headerValuesCount = 0;
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
        ERROR_CODE.WORKSHEET_EMPTY,
        "Worksheet doesn't have any data",
      );
    }
  }
}
