import { DataSourceId, SyncConnectionStatus } from '@lib/core';
import {
  IDataSourceRepository,
  ISyncConnectionRepository,
  InjectTokens,
} from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DataSourceService {
  private readonly logger = new Logger(DataSourceService.name);

  constructor(
    @Inject(InjectTokens.DATA_SOURCE_REPOSITORY)
    private readonly dataSourceRepository: IDataSourceRepository,
    @Inject(InjectTokens.SYNC_CONNECTION_REPOSITORY)
    private readonly syncConnectionRepository: ISyncConnectionRepository,
  ) {}

  async handleDataSourceError(dataSourceId: DataSourceId) {
    this.logger.debug('handleDataSourceError', dataSourceId);
    const syncConnection =
      await this.syncConnectionRepository.getByDataSourceId(dataSourceId);
    if (!syncConnection) {
      this.logger.warn(
        `No sync connection found for data source: ${dataSourceId}`,
      );
      return;
    }
    if (syncConnection.state.status === SyncConnectionStatus.ACTIVE) {
      await this.syncConnectionRepository.updateState({
        id: syncConnection.id,
        status: SyncConnectionStatus.INACTIVE,
      });
      this.logger.log(`Sync connection stopped, ds = ${dataSourceId}`);
    }
  }
}
