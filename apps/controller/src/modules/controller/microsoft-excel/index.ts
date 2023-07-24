import { Injectable, Logger } from '@nestjs/common';
import {
  MicrosoftGraphService,
  MicrosoftService,
} from '@lib/modules/third-party';
import { SyncflowController } from '../controller.factory';
import {
  DataSource,
  ExcelDataSourceConfig,
  MicrosoftExcelFullSyncCursor,
  Syncflow,
} from '@lib/core';
import { UnacceptableActivityError } from 'apps/controller/src/common/exception';

@Injectable()
export class MicrosoftExcelSyncflowController implements SyncflowController {
  private readonly logger = new Logger(MicrosoftExcelSyncflowController.name);

  constructor(
    private readonly microsoftService: MicrosoftService,
    private readonly microsoftGraphService: MicrosoftGraphService,
  ) {}

  public async run(syncflow: Syncflow, dataSource: DataSource) {
    const accessToken = await this.microsoftService.getAccessToken(
      dataSource.config.auth.refreshToken,
    );
    const client = await this.microsoftGraphService.createClient(accessToken);
    const workbookCtag = await this.microsoftGraphService.getWorkbookFileInfo({
      client,
      workbookId: (dataSource.config as ExcelDataSourceConfig).workbookId,
      select: ['ctag'],
    });
    if (
      workbookCtag === (syncflow.state as MicrosoftExcelFullSyncCursor).ctag
    ) {
      throw new UnacceptableActivityError(
        `Syncflow ${syncflow.id} with ds not changed, skipping`,
        { shouldWorkflowFail: false },
      );
    }
  }
}
