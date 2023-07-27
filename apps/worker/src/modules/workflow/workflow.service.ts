import { Syncflow, SyncflowId, SyncflowState, WorkflowStatus } from '@lib/core';
import { ISyncflowRepository, InjectTokens } from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { UnacceptableActivityError } from '../../common/exception';
import { AcceptableActivityError } from 'apps/controller/src/common/exception';

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

    // avoid idempotency
    if (syncflow.state.status === WorkflowStatus.RUNNING) {
      throw new AcceptableActivityError(
        `Syncflow already started: ${syncflow.id}`,
        syncflow,
      );
    }

    const syncflowAfterUpdated = await this.syncFlowRepository.updateStatus(
      id,
      WorkflowStatus.RUNNING,
      { new: true },
    );
    return syncflowAfterUpdated;
  }

  async updateSyncflowStatus(id: string, status: WorkflowStatus) {
    return this.syncFlowRepository.updateStatus(id, status);
  }

  async updateSyncflowState(id: string, state: Partial<SyncflowState>) {
    return this.syncFlowRepository.updateState(id, { ...state });
  }
}
