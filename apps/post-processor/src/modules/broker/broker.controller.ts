import { Controller, Logger, Post } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { BrokerService } from './broker.service';
import {
  DataSourceErrorPayload,
  EventNames,
  SyncflowSucceedPayload,
} from '@lib/core';
import { SyncflowService } from '../syncflow/syncflow.service';
import { DataSourceService } from '../data-source/dataSource.service';

@Controller('broker')
export class BrokerController {
  private readonly logger = new Logger(BrokerController.name);

  constructor(
    private readonly brokerService: BrokerService,
    private readonly syncflowService: SyncflowService,
    private readonly dataSourceService: DataSourceService,
  ) {}

  @EventPattern(EventNames.SYNCFLOW_SUCCEED)
  async handleSyncflowSucceedEvent(payload: SyncflowSucceedPayload) {
    this.logger.debug(
      `handle syncflow succeed event, ds = ${payload.dataSourceId}`,
    );
    return this.syncflowService.handleSyncflowSucceed(payload);
  }

  @EventPattern(EventNames.DATA_SOURCE_ERROR)
  async handleDataSourceErrorEvent(payload: DataSourceErrorPayload) {
    this.logger.debug(
      `handle data source error event, ds = ${payload.dataSourceId}`,
    );
    return this.dataSourceService.handleDataSourceError(payload.dataSourceId);
  }

  // @EventPattern('test-event-to-post-processor')
  async testEvent(message: any) {
    this.logger.debug('test-event-to-post-processor', message);
  }

  @Post('test-sent')
  async testSent() {
    await this.brokerService.testSentEvent();
  }
}
