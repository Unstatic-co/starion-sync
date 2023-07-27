import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { DataDiscoverer } from '../data-discoverer.factory';
import {
  MicrosoftGraphService,
  MicrosoftService,
} from '@lib/modules/third-party';
import { DiscoveredExcelDataSource } from '../discoverer.interface';
import { ExcelProviderConfig } from '@lib/core';
import { ApiError } from 'apps/configurator/src/common/exception/api.exception';

@Injectable()
export class MicrosoftExcelDiscoverer implements DataDiscoverer {
  private readonly logger = new Logger(MicrosoftExcelDiscoverer.name);

  constructor(
    private readonly microsoftService: MicrosoftService,
    private readonly microsoftGraphService: MicrosoftGraphService,
  ) {}

  public async check(config: ExcelProviderConfig): Promise<void> {
    const accessToken = await this.microsoftService.getAccessToken(
      config.auth.refreshToken,
    );
    const client = await this.microsoftGraphService.createClient(accessToken);
    const sessionId = await this.microsoftGraphService.createWorkbookSession(
      client,
      config.workbookId,
      false,
    );
    const [worksheets, workbookFileInfo] = await Promise.all([
      this.microsoftGraphService.listWorksheets(
        client,
        config.workbookId,
        sessionId,
      ),
      this.microsoftGraphService.getWorkbookFileInfo({
        client,
        workbookId: config.workbookId,
        workbookSessionId: sessionId,
      }),
    ]);
  }

  public async discover(
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
