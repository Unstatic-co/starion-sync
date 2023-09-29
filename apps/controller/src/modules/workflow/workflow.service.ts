import { Trigger, WorkflowStatus, WorkflowType } from '@lib/core';
import {
  IDataSourceRepository,
  ISyncflowRepository,
  ITriggerRepository,
  InjectTokens,
} from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSourceService } from '../datasource/datasource.service';
import {
  AcceptableActivityError,
  UnacceptableActivityError,
} from '../../common/exception';
import { SyncflowControllerFactory } from '../controller/controller.factory';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @Inject(InjectTokens.TRIGGER_REPOSITORY)
    private readonly triggerRepository: ITriggerRepository,
    @Inject(InjectTokens.SYNCFLOW_REPOSITORY)
    private readonly syncflowRepository: ISyncflowRepository,
    @Inject(InjectTokens.DATA_SOURCE_REPOSITORY)
    private readonly dataSourceRepository: IDataSourceRepository,
    private readonly dataSourceService: DataSourceService,
    private readonly syncflowControllerFactory: SyncflowControllerFactory,
  ) {}

  async checkWorkflowAlreadyScheduled(trigger: Trigger) {
    const workflow = await this.syncflowRepository.getById(trigger.workflow.id);
    if (!workflow) {
      this.logger.warn(`Workflow not found: ${trigger.workflow.id}`);
      throw new UnacceptableActivityError(
        `Workflow not found: ${trigger.workflow.id}`,
        { shouldWorkflowFail: false },
      );
    }
    if (workflow.state.status !== WorkflowStatus.IDLING) {
      throw new UnacceptableActivityError(
        `Workflow status is already scheduled or running: ${workflow.id}`,
        { shouldWorkflowFail: false },
      );
    }
  }

  async handleWorkflowTriggered(trigger: Trigger) {
    this.logger.debug('handleWorkflowTriggered', trigger);
    const triggerFromDb = await this.triggerRepository.getById(trigger.id);
    if (!triggerFromDb) {
      this.logger.warn(`Trigger not found: ${trigger.id}`);
      throw new UnacceptableActivityError(`Trigger not found: ${trigger.id}`, {
        shouldWorkflowFail: false,
      });
    }
    switch (trigger.workflow.type) {
      case WorkflowType.SYNCFLOW:
        return this.handleSyncflowTriggered(trigger);
      default:
        throw new UnacceptableActivityError(
          `Unknown workflow type: ${trigger.type}`,
          {
            shouldWorkflowFail: true,
          },
        );
    }
  }

  async handleSyncflowTriggered(trigger: Trigger) {
    this.logger.debug('handleWorkflowTriggered', trigger);
    const [syncflow, dataSource] = await Promise.all([
      this.syncflowRepository.getById(trigger.workflow.id),
      this.dataSourceRepository.getById(trigger.sourceId),
    ]);
    if (!dataSource) {
      this.logger.warn(`DataSource not found: ${syncflow.sourceId}`);
      throw new UnacceptableActivityError(
        `DataSource not found: ${syncflow.sourceId}`,
        { shouldWorkflowFail: false },
      );
    }
    if (!syncflow) {
      this.logger.warn(`Syncflow not found: ${trigger.workflow.id}`);
      throw new UnacceptableActivityError(
        `Syncflow not found: ${trigger.workflow.id}`,
        { shouldWorkflowFail: false },
      );
    }

    // check status (to avoid idempotency)
    if (syncflow.state.status === WorkflowStatus.SCHEDULED) {
      throw new AcceptableActivityError(
        `Syncflow status is already scheduled: ${syncflow.id}`,
        syncflow,
      );
    }

    const syncflowController = this.syncflowControllerFactory.get(
      dataSource.provider.type,
    );
    await Promise.all([
      this.dataSourceService.checkLimitation(dataSource),
      // syncflowController.run(syncflow, dataSource),
    ]);

    const triggeredSyncflow = await this.syncflowRepository.updateState(
      syncflow.id,
      {
        status: WorkflowStatus.SCHEDULED,
      },
      { new: true },
    );

    return triggeredSyncflow;
  }
}
