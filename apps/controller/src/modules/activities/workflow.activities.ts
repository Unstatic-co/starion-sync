import { Injectable } from '@nestjs/common';
import { WorkflowService } from '../workflow/workflow.service';
import { AcceptableError } from '../../common/exception';

@Injectable()
export class WorkflowActivities {
  constructor(private readonly workflowService: WorkflowService) {}

  async isWorkflowScheduled(arg: any) {
    try {
      const result = await this.workflowService.isWorkflowScheduled(arg);
      return result;
    } catch (error) {
      if (error instanceof AcceptableError) {
        return error.data;
      } else {
        throw error;
      }
    }
  }

  async handleWorkflowTriggered(arg: any) {
    try {
      const result = await this.workflowService.handleWorkflowTriggered(arg);
      return result;
    } catch (error) {
      if (error instanceof AcceptableError) {
        return error.data;
      } else {
        throw error;
      }
    }
  }
}
