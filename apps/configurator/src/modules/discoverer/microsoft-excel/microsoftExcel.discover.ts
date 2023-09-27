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
}
