import {
  IDataSourceRepository,
  ISyncflowRepository,
  InjectTokens,
} from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CleanerFactory } from '../cleaner/cleaner.factory';
import {
  EventNames,
  SyncflowCompletedPayload,
  SyncflowSucceedPayload,
} from '@lib/core';
import { BrokerService } from '../broker/broker.service';

@Injectable()
export class SyncflowService {
  private readonly logger = new Logger(SyncflowService.name);

  constructor(
    @Inject(InjectTokens.SYNCFLOW_REPOSITORY)
    private readonly syncflowRepository: ISyncflowRepository,
    @Inject(InjectTokens.DATA_SOURCE_REPOSITORY)
    private readonly dataSourceRepository: IDataSourceRepository,
    private readonly cleanerFactory: CleanerFactory,
    private readonly brokerService: BrokerService,
  ) {}

  async handleSyncflowSucceed(data: SyncflowSucceedPayload): Promise<void> {
    const { syncflowId, dataSourceId, syncVersion, prevSyncVersion } = data;
    this.logger.log(`Handling syncflow succeeded for ${syncflowId}`);

    const [syncflow, dataSource] = await Promise.all([
      this.syncflowRepository.getById(syncflowId, { includeDeleted: true }),
      this.dataSourceRepository.getById(dataSourceId, { includeDeleted: true }),
    ]);
    if (!syncflow) {
      this.logger.warn(`Syncflow not found: ${syncflowId}`);
      return;
    }
    if (!dataSource) {
      this.logger.warn(`Data source not found: ${syncflow.sourceId}`);
      return;
    }
    const cleaner = this.cleanerFactory.get(dataSource.provider.type);

    await cleaner.run(syncflow, { syncVersion, prevSyncVersion });

    const rowsNumber =
      dataSource.statistics.rowsNumber +
      (data.loadedDataStatistics.addedRowsCount -
        data.loadedDataStatistics.deletedRowsCount);
    await this.dataSourceRepository.updateStatistics(dataSourceId, {
      rowsNumber,
    });

    await this.brokerService.emitEvent(EventNames.SYNCFLOW_COMPLETED, {
      payload: {
        syncflowId,
        dataSourceId,
        syncVersion,
        rowsNumber,
      } as SyncflowCompletedPayload,
    });
  }
}
