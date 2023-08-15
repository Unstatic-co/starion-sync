import { ISyncflowRepository, InjectTokens } from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { WorkflowCleaner } from '../cleaner.factory';
import { Syncflow } from '@lib/core';

@Injectable()
export class MicrosoftExcelCleanerService implements WorkflowCleaner {
  private readonly logger = new Logger(MicrosoftExcelCleanerService.name);

  constructor(
    @Inject(InjectTokens.SYNCFLOW_REPOSITORY)
    private readonly syncflowRepository: ISyncflowRepository,
  ) {}

  async run(syncflow: Syncflow) {
    this.logger.log(`Cleaning workflow ${syncflow.id}`);
  }
}
