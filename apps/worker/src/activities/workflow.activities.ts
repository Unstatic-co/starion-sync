import { Injectable } from '@nestjs/common';
import { WorkflowService } from '../modules/workflow/workflow.service';
import { activityWrapper } from './wrapper';

@Injectable()
export class WorkflowActivities {
  constructor(private readonly workflowService: WorkflowService) {}

  async checkAndUpdateStatusBeforeStartSyncflow(arg: any) {
    return activityWrapper(() =>
      this.workflowService.checkAndUpdateStatusBeforeStartSyncflow(arg),
    );
  }

  async updateSyncflowStatus(id: string, status: any) {
    return activityWrapper(() =>
      this.workflowService.updateSyncflowStatus(id, status),
    );
  }
}
