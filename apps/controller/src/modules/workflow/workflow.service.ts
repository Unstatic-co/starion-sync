import { Trigger, WorkflowStatus, WorkflowType } from '@lib/core';
import {
  ISyncflowRepository,
  ITriggerRepository,
  InjectTokens,
} from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AcceptableError, UnacceptableError } from '../../common/exception';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @Inject(InjectTokens.TRIGGER_REPOSITORY)
    private readonly triggerRepository: ITriggerRepository,
    @Inject(InjectTokens.SYNCFLOW_REPOSITORY)
    private readonly syncflowRepository: ISyncflowRepository,
  ) {}

  async isWorkflowScheduled(trigger: Trigger) {
    const workflow = await this.syncflowRepository.getById(trigger.workflow.id);
    if (!workflow) {
      this.logger.warn(`Workflow not found: ${trigger.workflow.id}`);
      throw new UnacceptableError(`Workflow not found: ${trigger.workflow.id}`);
    }
    return workflow.state.status === WorkflowStatus.SCHEDULED;
  }

  async handleWorkflowTriggered(trigger: Trigger) {
    this.logger.debug('handleWorkflowTriggered', trigger);
    const triggerFromDb = await this.triggerRepository.getById(trigger.id);
    if (!triggerFromDb) {
      this.logger.warn(`Trigger not found: ${trigger.id}`);
      throw new UnacceptableError(`Trigger not found: ${trigger.id}`);
    }
    switch (trigger.workflow.type) {
      case WorkflowType.SYNCFLOW:
        return this.handleSyncflowTriggered(trigger);
      default:
        throw new UnacceptableError(`Unknown workflow type: ${trigger.type}`);
    }
  }

  async handleSyncflowTriggered(trigger: Trigger) {
    this.logger.debug('handleWorkflowTriggered', trigger);
    const syncflow = await this.syncflowRepository.getById(trigger.workflow.id);
    if (!syncflow) {
      this.logger.warn(`Syncflow not found: ${trigger.workflow.id}`);
      throw new UnacceptableError(`Syncflow not found: ${trigger.workflow.id}`);
    }
    if (syncflow.state.status !== WorkflowStatus.IDLING) {
      if (syncflow.state.status === WorkflowStatus.SCHEDULED) {
        this.logger.debug(
          `Syncflow status is already scheduled: ${syncflow.id}`,
        );
        throw new AcceptableError(
          `Syncflow status is already scheduled: ${syncflow.id}`,
          syncflow,
        );
      }
      this.logger.debug(`Syncflow status is not idling: ${trigger.id}`);
      throw new AcceptableError(`Syncflow is running: ${trigger.id}`);
    }
    const triggeredSyncflow = await this.syncflowRepository.updateStatus(
      syncflow.id,
      WorkflowStatus.SCHEDULED,
      { new: true },
    );
    return triggeredSyncflow;
  }
}
