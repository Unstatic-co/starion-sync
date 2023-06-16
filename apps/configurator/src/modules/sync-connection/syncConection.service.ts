import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataProviderService } from '../data-provider/data-provider.service';
import {
  DataSourceId,
  ProviderSyncflowsRegistry,
  SyncConnection,
  SyncflowRegistry,
} from '@lib/core';
import {
  IDataProviderRepository,
  IDataSourceRepository,
  ISyncConnectionRepository,
  InjectTokens,
} from '@lib/modules';
import { ApiError } from '../../common/exception/api.exception';
import { ErrorCode } from '../../common/constants';
import { CreationResult } from '../../common/type';
import { CreateSyncConnectionDto } from './dto/createSyncConnection.dto';
import { DataSourceService } from '../data-source/data-source.service';
import { TriggerRegistry } from '@lib/core/entities/trigger';

@Injectable()
export class SyncConnectionService {
  private readonly logger = new Logger(SyncConnectionService.name);

  constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly dataSourceService: DataSourceService,
    @Inject(InjectTokens.SYNC_CONNECTION_REPOSITORY)
    private readonly syncConnectionRepository: ISyncConnectionRepository,
    @Inject(InjectTokens.DATA_PROVIDER_REPOSITORY)
    private readonly dataProviderRepository: IDataProviderRepository,
    @Inject(InjectTokens.DATA_SOURCE_REPOSITORY)
    private readonly dataSourceRepository: IDataSourceRepository,
  ) {}

  public async getById(id: DataSourceId) {
    this.logger.debug(`Get data source by id: ${id}`);
    const syncConnection = await this.syncConnectionRepository.getById(id);
    if (!syncConnection) {
      throw new ApiError(
        ErrorCode.NO_DATA_EXISTS,
        `SyncConnection with id ${id} not found`,
      );
    }
    return syncConnection;
  }

  async create(
    data: CreateSyncConnectionDto,
  ): Promise<CreationResult<SyncConnection>> {
    this.logger.debug(
      `Create sync connection with data source id: ${data.sourceId}`,
    );
    let isAlreadyCreated = false;
    const existingSyncConnection =
      await this.syncConnectionRepository.getByDataSourceId(data.sourceId);
    if (existingSyncConnection) {
      isAlreadyCreated = true;
      return {
        isAlreadyCreated,
        data: existingSyncConnection,
      };
    }

    const dataSource = await this.dataSourceRepository.getById(data.sourceId);
    if (!dataSource) {
      throw new ApiError(
        ErrorCode.NO_DATA_EXISTS,
        `DataSource with id ${data.sourceId} not found`,
      );
    }

    const syncflowNames = ProviderSyncflowsRegistry.get(
      dataSource.provider.type,
    );
    if (!syncflowNames.length) {
      throw new ApiError(
        ErrorCode.NO_DATA_EXISTS,
        `No syncflow found for provider type ${dataSource.provider.type}`,
      );
    }
    const syncflowsFromRegistry = syncflowNames.map((name) =>
      SyncflowRegistry.get(name),
    );

    const syncConnection = await this.syncConnectionRepository.create({
      config: data.config,
      sourceId: data.sourceId,
      syncflows: syncflowsFromRegistry.map((syncflow) => {
        const triggerFromRegistry = TriggerRegistry.get(syncflow.triggerName);
        return {
          name: syncflow.name,
          attributes: syncflow.attributes,
          trigger: {
            name: triggerFromRegistry.name,
            type: triggerFromRegistry.type,
          },
        };
      }),
    });

    return {
      isAlreadyCreated,
      data: syncConnection,
    };
  }
}
