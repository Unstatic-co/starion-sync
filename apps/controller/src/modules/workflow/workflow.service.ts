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
  ) {}

  async checkWorkflowAlreadyScheduled(trigger: Trigger) {
    const workflow = await this.syncflowRepository.getById(trigger.workflow.id);
    if (!workflow) {
      this.logger.warn(`Workflow not found: ${trigger.workflow.id}`);
      throw new UnacceptableActivityError(
        `Workflow not found: ${trigger.workflow.id}`,
      );
    }
    if (workflow.state.status === WorkflowStatus.SCHEDULED) {
      throw new UnacceptableActivityError(
        `Workflow status is already scheduled: ${workflow.id}`,
        { shouldWorkflowFail: false, shouldActivityRetry: false },
      );
    }
  }

  async handleWorkflowTriggered(trigger: Trigger) {
    this.logger.debug('handleWorkflowTriggered', trigger);
    const triggerFromDb = await this.triggerRepository.getById(trigger.id);
    if (!triggerFromDb) {
      throw new UnacceptableActivityError(`Trigger not found: ${trigger.id}`);
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
    const syncflow = await this.syncflowRepository.getById(trigger.workflow.id);
    if (!syncflow) {
      this.logger.warn(`Syncflow not found: ${trigger.workflow.id}`);
      throw new UnacceptableActivityError(
        `Syncflow not found: ${trigger.workflow.id}`,
      );
    }
    const dataSource = await this.dataSourceRepository.getById(
      syncflow.sourceId,
    );

    await this.dataSourceService.checkLimitation(dataSource);

    if (syncflow.state.status !== WorkflowStatus.IDLING) {
      if (syncflow.state.status === WorkflowStatus.SCHEDULED) {
        throw new AcceptableActivityError(
          `Syncflow status is already scheduled: ${syncflow.id}`,
          syncflow,
        );
      }
      this.logger.debug(`Syncflow status is not idling: ${trigger.id}`);
      throw new UnacceptableActivityError(`Syncflow is running: ${trigger.id}`);
    }

    const triggeredSyncflow = await this.syncflowRepository.updateStatus(
      syncflow.id,
      WorkflowStatus.SCHEDULED,
      { new: true },
    );

    return triggeredSyncflow;
  }
}
