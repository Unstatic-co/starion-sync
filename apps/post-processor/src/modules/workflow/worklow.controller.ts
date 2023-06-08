import { Controller, Post } from '@nestjs/common';
import { WorkflowService } from './workflow.service';

@Controller('/workflow')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post('/test')
  test() {
    return this.workflowService.executeWorkflow('TestWorkflow', {
      taskQueue: 'default',
      workflowId: 'id-1',
    });
  }
}
