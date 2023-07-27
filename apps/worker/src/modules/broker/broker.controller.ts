import { Controller, Logger, Post } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { BrokerService } from './broker.service';
import { EventNames, SyncflowScheduledPayload, WorkflowType } from '@lib/core';
import { OrchestratorService } from '@lib/modules';
import { WorkflowIdReusePolicy } from '@temporalio/common';

@Controller('broker')
export class BrokerController {
  private readonly logger = new Logger(BrokerController.name);
  constructor(
    private readonly brokerService: BrokerService,
    private readonly orchestratorService: OrchestratorService,
  ) {}

  @EventPattern(EventNames.SYNCFLOW_SCHEDULED)
  async handleSyncflowScheduledEvent(payload: SyncflowScheduledPayload) {
    this.logger.debug('handleSyncflowScheduledEvent', payload);
    return this.orchestratorService.executeWorkflow(payload.syncflow.name, {
      workflowId: `${payload.syncflow.id}-${payload.version}`,
      args: [payload],
      workflowExecutionTimeout: 60000,
      workflowIdReusePolicy:
        WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE,
    });
  }

  @EventPattern('test-event-to-worker')
  async testEvent(message: any) {
    this.logger.debug('test-event-to-worker', message);
  }

  @Post('test-sent')
  async testSent() {
    await this.brokerService.testSentEvent();
  }
}
