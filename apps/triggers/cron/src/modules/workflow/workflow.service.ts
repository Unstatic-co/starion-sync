import { ConfigName } from '@lib/core/config';
import { InjectTokens } from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client,
  Workflow,
  WorkflowExecutionAlreadyStartedError,
  WorkflowStartOptions,
} from '@temporalio/client';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(InjectTokens.ORCHESTRATOR_CLIENT)
    private readonly orchestratorClient: Client,
  ) {}

  async executeWorkflow(
    workflow: string | Workflow,
    options: {
      taskQueue?: string;
    } & Partial<WorkflowStartOptions>,
  ) {
    const workflowName =
      typeof workflow === 'string' ? workflow : workflow.name;
    this.logger.debug(`Execute workflow: ${workflowName}`);
    let handle;
    let result;
    const defaultTaskQueue = this.configService.get<string>(
      `${ConfigName.ORCHESTRATOR}.defaultTaskQueue`,
    );
    const taskQueue = options.taskQueue || defaultTaskQueue;
    try {
      handle = await this.orchestratorClient.workflow.start(workflow, {
        ...options,
        taskQueue,
      } as WorkflowStartOptions);
      result = await handle.result();
    } catch (err) {
      if (err instanceof WorkflowExecutionAlreadyStartedError) {
        this.logger.debug(`Reusing existing workflow: ${workflowName}`);
        handle = await this.orchestratorClient.workflow.getHandle(workflowName);
      } else {
        throw err;
      }
    }

    return result;
  }
}
