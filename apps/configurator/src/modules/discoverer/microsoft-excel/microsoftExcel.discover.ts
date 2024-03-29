import { Injectable, Logger } from '@nestjs/common';
import {
  MicrosoftGraphService,
  MicrosoftService,
} from '@lib/modules/third-party';
import {
  DataDiscoverer,
  DiscoveredExcelDataSource,
} from '../discoverer.interface';
import {
  ERROR_CODE,
  ExcelDataSourceConfig,
  ExcelProviderConfig,
  ExternalError,
  IdColumnName,
} from '@lib/core';
import { Client } from '@microsoft/microsoft-graph-client';
import { Utils } from 'apps/configurator/src/common/utils';

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
    const [worksheets] = await Promise.all([
      this.microsoftGraphService.getWorkbookFileInfo({
        client,
        workbookId: config.workbookId,
        workbookSessionId: sessionId,
        select: [''],
      }),
      this.microsoftGraphService
        .listWorksheets(client, workbookId, sessionId)
        .then((worksheets) => {
          const worksheet = worksheets.find(
            (discoveredWorksheet) => discoveredWorksheet.id === worksheetId,
          );
          if (!worksheet) {
            throw new ExternalError(
              ERROR_CODE.WORKSHEET_NOT_FOUND,
              "Worksheet doesn't exist",
            );
          }
        }),
    ]);
    await this.checkEmpty(client, sessionId, config);
    this.microsoftGraphService.closeWorkbookSession(
      client,
      workbookId,
      sessionId,
    );
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
    let isIdColContained = false;

    try {
      const firstRowOfSheet =
        await this.microsoftGraphService.getWorksheetUsedRangeRow({
          client,
          workbookId,
          worksheetId,
          row: 0,
          workbookSessionId: sessionId,
          select: ['address', 'values'],
        });
      const firstRowNumber = Utils.getFirstRowFromA1Notation(
        firstRowOfSheet.address,
      );
      if (firstRowNumber !== 1) {
        isEmpty = true;
      } else {
        const headerValues = firstRowOfSheet.values[0];
        let headerValuesCount = 0;
        for (const value of headerValues) {
          if (value !== '') {
            headerValuesCount++;
            if (value === IdColumnName) {
              if (isIdColContained) {
                throw new ExternalError(
                  ERROR_CODE.ID_COLUMN_DUPLICATED,
                  `The id column (${IdColumnName}) is duplicated`,
                );
              }
              isIdColContained = true;
            }
          }
        }
        if (!headerValues.length || headerValuesCount === 0) {
          isEmpty = true;
        }
      }
    } catch (error) {
      if (
        error instanceof ExternalError &&
        error.code === ERROR_CODE.WORKSHEET_RANGE_NOT_FOUND
      ) {
        isEmpty = true;
      } else {
        throw error;
      }
    }

    if (isEmpty) {
      throw new ExternalError(
        ERROR_CODE.WORKSHEET_EMPTY,
        "Worksheet doesn't have any data",
      );
    }
  }

  async discoverConfig(dataSourceConfig: Partial<ExcelDataSourceConfig>) {
    return dataSourceConfig as ExcelDataSourceConfig;
  }
}
