import { Inject, Injectable, Logger } from '@nestjs/common';
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
import { ISyncflowRepository, InjectTokens } from '@lib/modules';

@Injectable()
export class MicrosoftExcelSyncflowController implements SyncflowController {
  private readonly logger = new Logger(MicrosoftExcelSyncflowController.name);

  constructor(
    private readonly microsoftService: MicrosoftService,
    private readonly microsoftGraphService: MicrosoftGraphService,
    @Inject(InjectTokens.SYNCFLOW_REPOSITORY)
    private readonly syncflowRepository: ISyncflowRepository,
  ) {}

  public async run(syncflow: Syncflow, dataSource: DataSource) {
    const accessToken = await this.microsoftService.getAccessToken(
      dataSource.config.auth.refreshToken,
    );
    const client = await this.microsoftGraphService.createClient(accessToken);
    const ctag = await this.microsoftGraphService
      .getWorkbookFileInfo({
        client,
        workbookId: (dataSource.config as ExcelDataSourceConfig).workbookId,
        select: ['cTag'],
      })
      .then((res) => res.cTag);
    if (
      ctag === (syncflow.state.cursor as MicrosoftExcelFullSyncCursor)?.ctag
    ) {
      // this.logger.debug(
      // `Syncflow ${syncflow.id} with ds not changed, skipping`,
      // );
      throw new UnacceptableActivityError(
        `Syncflow ${syncflow.id} with ds not changed, skipping`,
        { shouldWorkflowFail: false },
      );
    }
    await this.syncflowRepository.updateState(syncflow.id, {
      cursor: { ctag },
    });
  }
}
