import { Controller, Logger, Post } from '@nestjs/common';
import { BrokerService } from './broker.service';
import { OrchestratorService } from '@lib/modules';
import { ConfigService } from '@nestjs/config';

@Controller('broker')
export class BrokerController {
  private readonly logger = new Logger(BrokerController.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly brokerService: BrokerService,
    private readonly orchestratorService: OrchestratorService,
  ) {}

  // @EventPattern(EventNames.WORKFLOW_TRIGGERED)
  // async handleWorkflowTriggeredEvent(payload: WorkflowTriggeredPayload) {
  // this.logger.log(`handleWorkflowTriggeredEvent: triggerId = ${payload.id}`);
  // await this.orchestratorService.executeWorkflow(handleWorkflowTriggeredWf, {
  // workflowId: `${payload.id}`,
  // args: [payload],
  // // workflowExecutionTimeout: 5000,
  // workflowIdReusePolicy:
  // WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE,
  // searchAttributes: {
  // DataSourceId: [payload.sourceId],
  // },
  // });
  // }

  // @EventPattern('test-event-to-controller')
  async testEvent(message: any) {
    this.logger.debug('test-event-to-controller', message);
  }

  @Post('test-sent-from-controller')
  async testSent() {
    await this.brokerService.testSentEvent();
  }
}
