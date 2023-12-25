import { Controller, Logger, Post } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { BrokerService } from './broker.service';
import { EventNames, SyncflowScheduledPayload, WorkflowType } from '@lib/core';
import { OrchestratorService } from '@lib/modules';
import { WorkflowIdReusePolicy } from '@temporalio/common';
import {
  GoogleSheetsDownloadPayload,
  GoogleSheetsProceedSyncPayload,
  WorkflowEvents,
} from '../../workflows/events';

@Controller('broker')
export class BrokerController {
  private readonly logger = new Logger(BrokerController.name);
  constructor(
    private readonly brokerService: BrokerService,
    private readonly orchestratorService: OrchestratorService,
  ) {}

  @EventPattern(EventNames.SYNCFLOW_SCHEDULED)
  async handleSyncflowScheduledEvent(payload: SyncflowScheduledPayload) {
    this.logger.log(
      `handleSyncflowScheduledEvent: syncflowId = ${payload.syncflow.id}`,
    );
    return this.orchestratorService.executeWorkflow(payload.syncflow.name, {
      workflowId: `${payload.syncflow.id}-${payload.version}`,
      args: [payload],
      workflowIdReusePolicy:
        WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE_FAILED_ONLY,
      searchAttributes: {
        DataSourceId: [payload.syncflow.sourceId],
      },
    });
  }

  @EventPattern(WorkflowEvents.GoogleSheetsDownload)
  async handleGoogleSheetsDownloadEvent(payload: GoogleSheetsDownloadPayload) {
    this.logger.log(
      `handleGoogleSheetsDownloadEvent: syncflowId = ${payload.syncflow.id}`,
    );
    return this.orchestratorService.executeWorkflow('googleSheetsDownload', {
      workflowId: `${payload.syncflow.id}-${payload.version}-download`,
      args: [payload],
      workflowIdReusePolicy:
        WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE_FAILED_ONLY,
      searchAttributes: {
        DataSourceId: [payload.syncflow.sourceId],
      },
    });
  }

  @EventPattern(WorkflowEvents.GoogleSheetsProceedSync)
  async handleGoogleSheetsProceedSyncEvent(
    payload: GoogleSheetsProceedSyncPayload,
  ) {
    this.logger.log(
      `handleGoogleSheetsProceedSyncEvent: syncflowId = ${payload.syncflow.id}`,
    );
    return this.orchestratorService.executeWorkflow('googleSheetsProceedSync', {
      workflowId: `${payload.syncflow.id}-${payload.version}-proceed`,
      args: [payload],
      workflowIdReusePolicy:
        WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE_FAILED_ONLY,
      searchAttributes: {
        DataSourceId: [payload.syncflow.sourceId],
      },
    });
  }

  // @EventPattern('test-event-to-worker')
  async testEvent(message: any) {
    this.logger.debug('test-event-to-worker', message);
  }

  @Post('test-sent')
  async testSent() {
    await this.brokerService.testSentEvent();
  }
}
