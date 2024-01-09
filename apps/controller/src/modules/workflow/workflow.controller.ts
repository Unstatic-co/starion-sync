import { Controller, Logger } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { EventNames, WorkflowTriggeredPayload } from '@lib/core';
import { WorkflowService } from './workflow.service';

@Controller('workflow')
export class WorkflowController {
  private readonly logger = new Logger(WorkflowController.name);
  constructor(private readonly workflowService: WorkflowService) {}

  @EventPattern(EventNames.WORKFLOW_TRIGGERED)
  async handleWorkflowTriggeredEvent(payload: WorkflowTriggeredPayload) {
    this.logger.log(`handleWorkflowTriggeredEvent: triggerId = ${payload.id}`);
    await this.workflowService.handleWorkflowTriggered(payload);
  }
}
