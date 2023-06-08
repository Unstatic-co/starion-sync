import { InjectTokens } from '@lib/modules';
import { Inject, Injectable } from '@nestjs/common';
import {
  Client,
  WorkflowExecutionAlreadyStartedError,
  WorkflowStartOptions,
} from '@temporalio/client';

@Injectable()
export class WorkflowService {
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
      console.log('Started new gg sheet workflow');
    } catch (err) {
      if (err instanceof WorkflowExecutionAlreadyStartedError) {
        console.log('Reusing existing exchange rates workflow');
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
