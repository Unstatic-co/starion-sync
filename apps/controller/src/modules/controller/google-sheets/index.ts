import { Inject, Injectable, Logger } from '@nestjs/common';
import { GoogleService, GoogleSheetsService } from '@lib/modules/third-party';
import { SyncflowController } from '../controller.factory';
import { DataSource, Syncflow } from '@lib/core';
import { ISyncflowRepository, InjectTokens } from '@lib/modules';

@Injectable()
export class GoogleSheetsSyncflowController implements SyncflowController {
  private readonly logger = new Logger(GoogleSheetsSyncflowController.name);

  constructor(
    private readonly googleService: GoogleService,
    private readonly googleSheetsService: GoogleSheetsService,
    @Inject(InjectTokens.SYNCFLOW_REPOSITORY)
    private readonly syncflowRepository: ISyncflowRepository,
  ) {}

  public async run(syncflow: Syncflow, dataSource: DataSource) {}
}
