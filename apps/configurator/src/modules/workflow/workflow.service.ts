import { ConfigName } from '@lib/core/config';
import { InjectTokens } from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client,
  Workflow,
  WorkflowExecutionAlreadyStartedError,
  WorkflowExecutionInfo,
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

  async terminateWorkflowsByAttributes(
    data: { [attr: string]: any },
    reason?: string,
  ) {
    try {
      const query = this.convertToQuery(data);
      this.logger.debug(`Terminate workflows: ${query}`);
      const listResult =
        await this.orchestratorClient.workflowService.listWorkflowExecutions({
          namespace: 'default',
          query,
        });
      this.logger.debug(`Found workflows: ${listResult.executions.length}`);
      await Promise.all(
        listResult.executions.map(async (execution) => {
          this.logger.debug(
            `Terminate workflow execution: ${execution.execution.workflowId} - ${execution.execution.runId}`,
          );
          await this.orchestratorClient.workflowService.terminateWorkflowExecution(
            {
              namespace: 'default',
              reason: reason || 'Terminated by system',
              workflowExecution: {
                workflowId: execution.execution.workflowId,
                runId: execution.execution.runId,
              },
            },
          );
        }),
      );
    } catch (error) {
      this.logger.debug(`Error terminate workflows: ${error.message}`);
      throw error;
    }
  }

  async terminateWorkflowsByQuery(query: string, reason?: string) {
    try {
      this.logger.debug(`Terminate workflows with query: ${query}`);
      const listResult =
        await this.orchestratorClient.workflowService.listWorkflowExecutions({
          namespace: 'default',
          query,
        });
      this.logger.debug(`Found workflows: ${listResult.executions.length}`);
      await Promise.all(
        listResult.executions.map(async (execution) => {
          this.logger.debug(
            `Terminate workflow: ${execution.execution.workflowId} - ${execution.execution.runId}`,
          );
          await this.orchestratorClient.workflowService.terminateWorkflowExecution(
            {
              namespace: 'default',
              reason: reason || 'Terminated by system',
              workflowExecution: {
                workflowId: execution.execution.workflowId,
                runId: execution.execution.runId,
              },
            },
          );
        }),
      );
    } catch (error) {
      this.logger.debug(`Error terminate workflows: ${error.message}`);
      throw error;
    }
  }

  private convertToQuery(data: { [attr: string]: any }) {
    return Object.keys(data)
      .map((key) => {
        const value = data[key];
        if (typeof value === 'string') {
          return `${key} = '${value}'`;
        }
        return `${key} = ${value}`;
      })
      .join(' and ');
  }
}
