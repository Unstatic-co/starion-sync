import { Injectable } from '@nestjs/common';
import { WorkflowService } from '../modules/workflow/workflow.service';
import { activityWrapper } from './wrapper';
import { SyncflowState } from '@lib/core';

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

  async updateSyncflowState(id: string, state: Partial<SyncflowState>) {
    return activityWrapper(() =>
      this.workflowService.updateSyncflowState(id, state),
    );
  }
}
