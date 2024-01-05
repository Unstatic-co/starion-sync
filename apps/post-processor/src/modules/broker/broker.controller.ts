import { Controller, Logger, Post } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { BrokerService } from './broker.service';
import {
  DataProviderDeletedPayload,
  DataSourceErrorPayload,
  EventNames,
  SyncflowFailedPayload,
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
  ) { }

  @EventPattern(EventNames.SYNCFLOW_SUCCEED)
  async handleSyncflowSucceedEvent(payload: SyncflowSucceedPayload) {
    this.logger.log(
      `handle syncflow succeed event, ds = ${payload.dataSourceId}`,
    );
    return this.syncflowService.handleSyncflowSucceed(payload);
  }

  @EventPattern(EventNames.SYNCFLOW_FAILED)
  async handleSyncflowFailedErrorEvent(payload: SyncflowFailedPayload) {
    this.logger.log(
      `handle syncflow failed event, ds = ${payload.dataSourceId}`,
    );
    return this.dataSourceService.handleSyncflowFailed(payload.dataSourceId);
  }

  @EventPattern(EventNames.DATA_SOURCE_ERROR)
  async handleDataSourceErrorEvent(payload: DataSourceErrorPayload) {
    this.logger.log(
      `handle data source error event, ds = ${payload.dataSourceId}`,
    );
    return this.dataSourceService.handleDataSourceError(payload.dataSourceId);
  }

  @EventPattern(EventNames.DATA_PROVIDER_DELETED)
  async handleDataProviderDeletedEvent(payload: DataProviderDeletedPayload) {
    this.logger.log(
      `handle data provider deleted event, provider = ${payload.providerId}`,
    );
    return this.dataSourceService.handleProviderDeleted({
      providerId: payload.providerId,
      providerType: payload.providerType,
    });
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
