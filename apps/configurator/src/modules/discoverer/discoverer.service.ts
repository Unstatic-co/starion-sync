import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataDiscovererFactory } from './data-discoverer.factory';
import { DiscoveredDataSource } from './discoverer.interface';
import {
  DataSourceConfig,
  ProviderConfig,
  ProviderId,
  ProviderType,
} from '@lib/core';
import { DataProviderRepository, InjectTokens } from '@lib/modules';
import { ApiError } from '../../common/exception/api.exception';
import { ErrorCode } from '../../common/constants';

@Injectable()
export class DataDiscovererService {
  private readonly logger = new Logger(DataDiscovererService.name);

  constructor(
    private readonly dataDiscovererFactory: DataDiscovererFactory,
    @Inject(InjectTokens.DATA_PROVIDER_REPOSITORY)
    private readonly dataProviderRepository: DataProviderRepository,
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

  public async discoverProvider(
    providerId: ProviderId,
  ): Promise<DiscoveredDataSource[]> {
    const dataProvider = await this.dataProviderRepository.getById(providerId);
    if (!dataProvider) {
      throw new Error(`DataProvider with id ${providerId} not found`);
    }
    this.logger.debug(`Discovering data for ${dataProvider.type}`);
    const dataDiscoverer = this.dataDiscovererFactory.get(dataProvider.type);
    const discoveredDataSources: DiscoveredDataSource[] =
      await dataDiscoverer.discoverProvider(dataProvider.config);
    return discoveredDataSources;
  }

  public async discoverProviderByConfig(
    providerType: ProviderType,
    config: ProviderConfig,
  ): Promise<DiscoveredDataSource[]> {
    const dataDiscoverer = this.dataDiscovererFactory.get(providerType);
    const discoveredDataSources: DiscoveredDataSource[] =
      await dataDiscoverer.discoverProvider(config);
    return discoveredDataSources;
  }

  public async discoverConfig(
    providerType: ProviderType,
    config: DataSourceConfig,
  ): Promise<DataSourceConfig> {
    this.logger.debug(`Discovering config for ${providerType}`);
    const dataDiscoverer = this.dataDiscovererFactory.get(providerType);
    const discoveredConfig = await dataDiscoverer.discoverConfig(config);
    return discoveredConfig;
  }

  public async checkDataSource(
    providerType: ProviderType,
    config: DataSourceConfig,
  ): Promise<void> {
    const dataDiscoverer = this.dataDiscovererFactory.get(providerType);
    await dataDiscoverer.checkDataSource(config);
  }
}
