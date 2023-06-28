import { Injectable } from '@nestjs/common';
import { WorkflowService } from '../workflow/workflow.service';
import { activityWrapper } from './wrapper';

@Injectable()
export class WorkflowActivities {
  constructor(private readonly workflowService: WorkflowService) {}

  async checkWorkflowAlreadyScheduled(arg: any) {
    return activityWrapper(() =>
      this.workflowService.checkWorkflowAlreadyScheduled(arg),
    );
  }

  async handleWorkflowTriggered(arg: any) {
    return activityWrapper(() =>
      this.workflowService.handleWorkflowTriggered(arg),
    );
  }
}
