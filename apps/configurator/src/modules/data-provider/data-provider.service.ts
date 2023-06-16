import { IDataProviderRepository } from '@lib/modules/repository';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CreateDataProviderDto,
  ProviderConfigDto,
} from './dto/createProvider.dto';
import { InjectTokens } from '@lib/modules';
import {
  DataProvider,
  ExcelProviderConfig,
  ProviderConfig,
  ProviderId,
  ProviderType,
} from '@lib/core';
import { DataDiscovererService } from '../discoverer/discoverer.service';
import { ApiError } from '../../common/exception/api.exception';
import { ErrorCode } from '../../common/constants';
import { DiscoveredDataSource } from '../discoverer/discoverer.interface';
import { UpdateDataProviderDto } from './dto/updateProvider.dto';
import { CreationResult } from '../../common/type';

export abstract class DataProviderService {
  abstract create(arg: any): Promise<CreationResult<DataProvider>>;
  abstract getById(id: ProviderId): Promise<DataProvider | null>;
  abstract getByExternalId(id: string): Promise<DataProvider | null>;
  abstract getOrGenerateProviderExternalId(
    type: ProviderType,
    config: ProviderConfigDto,
  ): string;
  abstract update(id: ProviderId, data: any): Promise<DataProvider>;
  abstract discover(id: ProviderId): Promise<DiscoveredDataSource[]>;
  abstract discoverByConfig(
    type: ProviderType,
    config: ProviderConfig,
  ): Promise<DiscoveredDataSource[]>;
}

@Injectable()
export class DefaultDataProviderService implements DataProviderService {
  private readonly logger = new Logger(DefaultDataProviderService.name);

  constructor(
    @Inject(InjectTokens.DATA_PROVIDER_REPOSITORY)
    private readonly dataProviderRepository: IDataProviderRepository,
    private readonly dataDiscovererService: DataDiscovererService,
  ) {}

  public async getById(id: ProviderId) {
    this.logger.debug(`Get provider by id: ${id}`);
    const dataProvider = await this.dataProviderRepository.getById(id);
    if (!dataProvider) {
      throw new ApiError(
        ErrorCode.NO_DATA_EXISTS,
        `DataProvider with id ${id} not found`,
      );
    }
    return dataProvider;
  }

  public async getByExternalId(externalId: string) {
    this.logger.debug(`Get provider by external id: ${externalId}`);
    return this.dataProviderRepository.getByExternalId(externalId);
  }

  public async create(dto: CreateDataProviderDto) {
    let isAlreadyCreated = false;
    const { type, config, metadata } = dto;
    const externalId = this.getOrGenerateProviderExternalId(type, config);
    const existingDataProvider =
      await this.dataProviderRepository.getByExternalId(externalId);
    if (existingDataProvider) {
      isAlreadyCreated = true;
      return {
        data: existingDataProvider,
        isAlreadyCreated,
      };
    }
    try {
      await this.dataDiscovererService.check(type, config);
    } catch (error) {
      throw new ApiError(
        ErrorCode.HEALTH_CHECK_FAILED,
        `Failed to check provider: ${error.message}`,
      );
    }
    return {
      data: await this.dataProviderRepository.create({
        type,
        externalId,
        config: config as unknown as ProviderConfig,
        metadata,
      }),
      isAlreadyCreated,
    };
  }

  public async update(id: ProviderId, data: UpdateDataProviderDto) {
    const { auth, metadata } = data;
    let result;
    try {
      result = await this.dataProviderRepository.update(
        {
          id,
          auth,
          metadata,
        },
        { new: true },
      );
    } catch (error) {
      throw new ApiError(
        ErrorCode.INVALID_DATA,
        `Failed to update provider: ${error.message}`,
      );
    }

    return result;
  }

  public async discover(providerId: ProviderId) {
    return this.dataDiscovererService.discover(providerId);
  }

  public async discoverByConfig(type: ProviderType, config: ProviderConfigDto) {
    return this.dataDiscovererService.discoverByConfig(type, config);
  }

  public getOrGenerateProviderExternalId(
    type: ProviderType,
    config: ProviderConfigDto,
  ) {
    switch (type) {
      case ProviderType.MICROSOFT_EXCEL:
        return (config as ExcelProviderConfig).workbookId;
      default:
        throw new Error(`Unknown provider type ${type}`);
    }
  }
}
