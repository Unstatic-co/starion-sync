import { InjectTokens } from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  Client,
  WorkflowExecutionAlreadyStartedError,
  WorkflowStartOptions,
} from '@temporalio/client';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @Inject(InjectTokens.ORCHESTRATOR_CLIENT)
    private readonly orchestratorClient: Client,
  ) {}

  async executeWorkflow(workflowName: string, options: WorkflowStartOptions) {
    let handle;
    try {
      handle = await this.orchestratorClient.workflow.start(
        workflowName,
        options,
      );
      this.logger.log('Started new gg sheet workflow');
    } catch (err) {
      if (err instanceof WorkflowExecutionAlreadyStartedError) {
        this.logger.log('Reusing existing exchange rates workflow');
        handle = await this.orchestratorClient.workflow.getHandle(
          'GoogleSheetsFullSyncWorkflow',
        );
      } else {
        throw err;
      }
    }

    return handle;
  }
}
