import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DataSourceId,
  ProviderSyncflowsRegistry,
  ProviderType,
  SyncConnection,
  SyncConnectionId,
  SyncConnectionState,
  SyncflowRegistry,
} from '@lib/core';
import {
  IDataSourceRepository,
  ISyncConnectionRepository,
  InjectTokens,
} from '@lib/modules';
import { ApiError } from '../../common/exception/api.exception';
import { ErrorCode } from '../../common/constants';
import { CreationResult } from '../../common/type';
import {
  CreateSyncConnectionConfigDto,
  CreateSyncConnectionDto,
  CreateSyncConnectionTriggerConfigDto,
} from './dto/createSyncConnection.dto';
import {
  DEFAULT_CRON_TRIGGER_FREQUENCY,
  TriggerRegistry,
  TriggerType,
} from '@lib/core/entities/trigger';
import { TriggerService } from '../trigger/trigger.service';
import { DeleteResult } from '../../common/type/deleteResult';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SyncConnectionService {
  private readonly logger = new Logger(SyncConnectionService.name);

  constructor(
    @Inject(InjectTokens.SYNC_CONNECTION_REPOSITORY)
    private readonly syncConnectionRepository: ISyncConnectionRepository,
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

    const syncflows = this.buildSyncflowData({
      config: data.config,
      providerType: dataSource.provider.type,
    });

    const syncConnection = await this.syncConnectionRepository.create({
      config: data.config,
      sourceId: data.sourceId,
      syncflows,
    });

    return {
      isAlreadyCreated,
      data: syncConnection,
    };
  }

  async updateStateWithDataSourceId(
    dataSourceId: DataSourceId,
    data: Partial<SyncConnectionState>,
  ) {
    this.logger.debug(
      `Update sync connection state with data source id: ${dataSourceId}`,
    );
    const syncConnection =
      await this.syncConnectionRepository.getByDataSourceId(dataSourceId);
    if (!syncConnection) {
      throw new ApiError(ErrorCode.NO_DATA_EXISTS, `Sync connection not found`);
    }
    const updates = {};
    if (data.status) {
      Object.assign(updates, { status: data.status });
    }
    await this.syncConnectionRepository.updateState({
      id: syncConnection.id,
      ...updates,
    });
    this.logger.log(`Sync connection state updated, ds = ${dataSourceId}`);
  }

  async delete(id: SyncConnectionId): Promise<DeleteResult<SyncConnection>> {
    this.logger.debug(`Delete sync connection with id: ${id}`);
    let isAlreadyDeleted = false;
    const existingSyncConnection = await this.syncConnectionRepository.getById(
      id,
    );
    if (!existingSyncConnection) {
      isAlreadyDeleted = true;
      return {
        isAlreadyDeleted,
        // data: existingSyncConnection,
      };
    }
    const data = (await this.syncConnectionRepository.delete(id, {
      old: true,
    })) as SyncConnection;
    return {
      isAlreadyDeleted,
      data,
    };
  }

  buildSyncflowData(data: {
    config: CreateSyncConnectionConfigDto;
    providerType: ProviderType;
  }) {
    const { config, providerType } = data;
    const syncflowNames = ProviderSyncflowsRegistry.get(providerType);
    if (!syncflowNames.length) {
      throw new ApiError(
        ErrorCode.NO_DATA_EXISTS,
        `No syncflow found for provider type ${providerType}`,
      );
    }
    const syncflowsFromRegistry = syncflowNames.map((name) =>
      SyncflowRegistry.get(name),
    );

    const result = syncflowsFromRegistry.map((syncflow) => {
      const triggerFromRegistry = TriggerRegistry.get(syncflow.triggerName);
      return {
        name: syncflow.name,
        attributes: syncflow.attributes,
        trigger: this.buildTriggerData({
          name: triggerFromRegistry.name,
          type: triggerFromRegistry.type,
          config: config?.trigger,
        }),
      };
    });

    return result;
  }

  buildTriggerData(data: {
    name: string;
    type: TriggerType;
    config?: CreateSyncConnectionTriggerConfigDto;
  }) {
    const { name, type, config } = data;
    const _config = {};
    if (type === TriggerType.CRON) {
      const frequency = config?.frequency || DEFAULT_CRON_TRIGGER_FREQUENCY;
      Object.assign(_config, {
        cron: TriggerService.createCronExpressionFromFrequency(frequency),
        frequency,
        jobId: uuidv4(),
      });
    }
    const result = { name, type };
    if (Object.keys(_config).length) {
      Object.assign(result, { config: _config });
    }
    return result;
  }
}
