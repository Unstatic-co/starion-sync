import { Syncflow, SyncflowId, WorkflowStatus } from '@lib/core';
import { ISyncflowRepository, InjectTokens } from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { UnacceptableActivityError } from '../../common/exception';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @Inject(InjectTokens.SYNCFLOW_REPOSITORY)
    private readonly syncFlowRepository: ISyncflowRepository,
  ) {}

  async checkAndUpdateStatusBeforeStartSyncflow(id: SyncflowId) {
    this.logger.debug('checkAndUpdateStatusBeforeStartSyncflow', id);
    const syncflow = await this.syncFlowRepository.getById(id);
    if (!syncflow) {
      throw new UnacceptableActivityError(
        `Syncflow not found: ${syncflow.id}`,
        {
          shouldWorkflowFail: false,
        },
      );
    }
    if (syncflow.state.status !== WorkflowStatus.SCHEDULED) {
      if (syncflow.state.status === WorkflowStatus.RUNNING) {
        throw new UnacceptableActivityError(
          `Syncflow already started: ${syncflow.id}`,
          {
            shouldWorkflowFail: false,
          },
        );
      }
    }
    const syncflowAfterUpdated = await this.syncFlowRepository.updateStatus(
      id,
      WorkflowStatus.RUNNING,
      { new: true },
    );
    return syncflowAfterUpdated;
  }
}
