import { IDataProviderRepository } from '@lib/modules/repository';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateDataProviderDto } from './dto/create-provider.dto';
import { InjectTokens } from '@lib/modules';
import {
  ExcelProviderConfig,
  ProviderConfig,
  ProviderId,
  ProviderType,
} from '@lib/core';
import { DataDiscovererService } from '../discoverer/discoverer.service';
import { ApiError } from '../../common/exception/api.exception';
import { ErrorCode } from '../../common/constants';

export abstract class DataProviderService {
  abstract findOne(): Promise<any>;
  abstract create(arg: any): Promise<any>;
}

@Injectable()
export class DefaultDataProviderService implements DataProviderService {
  private readonly logger = new Logger(DefaultDataProviderService.name);

  constructor(
    @Inject(InjectTokens.DATA_PROVIDER_REPOSITORY)
    private readonly dataProviderRepository: IDataProviderRepository,
    private readonly dataDiscovererService: DataDiscovererService,
  ) {}

  public async findOne() {
    this.logger.log('findOne');
    return await this.dataProviderRepository.getById('1');
  }

  public async create(dto: CreateDataProviderDto) {
    const { type, config, metadata } = dto;
    const externalId = this.getOrGenerateProviderExternalId(type, config);
    const existingDataProvider =
      await this.dataProviderRepository.getByExternalId(externalId);
    if (existingDataProvider) {
      return existingDataProvider;
    }
    try {
      await this.dataDiscovererService.check(type, config);
    } catch (error) {
      throw new ApiError(
        ErrorCode.HEALTH_CHECK_FAILED,
        `Failed to check provider: ${error.message}`,
      );
    }
    return await this.dataProviderRepository.create({
      type,
      externalId,
      config: config as unknown as ProviderConfig,
      metadata,
    });
  }

  public async discover(providerId: ProviderId) {
    return this.dataDiscovererService.discover(providerId);
  }

  private getOrGenerateProviderExternalId(
    type: ProviderType,
    config: ProviderConfig,
  ) {
    switch (type) {
      case ProviderType.MICROSOFT_EXCEL:
        return (config as ExcelProviderConfig).workbookId;
      default:
        throw new Error(`Unknown provider type ${type}`);
    }
  }
}
