import { Injectable, Logger } from '@nestjs/common';
import { DataDiscoverer } from '../data-discoverer.factory';
import {
  MicrosoftGraphService,
  MicrosoftService,
} from '@lib/modules/third-party';
import { DiscoveredExcelDataSource } from '../discoverer.interface';
import { ExcelProviderConfig } from '@lib/core';

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
    const [workbookFileInfo] = await Promise.all([
      this.microsoftGraphService.getWorkbookFileInfo({
        client,
        workbookId: config.workbookId,
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
