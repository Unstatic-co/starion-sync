import { DataSourceId, ProviderId, ProviderType, SyncConnectionStatus } from '@lib/core';
import {
  IDataProviderRepository,
  IDataSourceRepository,
  ISyncConnectionRepository,
  InjectTokens,
} from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CleanerFactory } from '../cleaner/cleaner.factory';

@Injectable()
export class DataSourceService {
  private readonly logger = new Logger(DataSourceService.name);

  constructor(
    @Inject(InjectTokens.DATA_PROVIDER_REPOSITORY)
    private readonly dataProviderRepository: IDataProviderRepository,
    @Inject(InjectTokens.DATA_SOURCE_REPOSITORY)
    private readonly dataSourceRepository: IDataSourceRepository,
    @Inject(InjectTokens.SYNC_CONNECTION_REPOSITORY)
    private readonly syncConnectionRepository: ISyncConnectionRepository,
    private readonly cleanerFactory: CleanerFactory,
  ) { }

  async handleDataSourceError(dataSourceId: DataSourceId) {
    await this.stopSyncConnection(dataSourceId);
  }

  async handleSyncflowFailed(dataSourceId: DataSourceId) {
    await this.stopSyncConnection(dataSourceId);
  }

  async stopSyncConnection(dataSourceId: DataSourceId) {
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

  async handleProviderDeleted(data: {
    providerId: ProviderId;
    providerType: ProviderType
  }) {
    const { providerId, providerType } = data;
    const cleaner = this.cleanerFactory.getDataProviderCleaner(providerType);

    await cleaner.run(providerId);
  }
}
