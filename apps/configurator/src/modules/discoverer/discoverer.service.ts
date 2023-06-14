import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataDiscovererFactory } from './data-discoverer.factory';
import { DiscoveredDataSource } from './discoverer.interface';
import { ProviderConfig, ProviderId, ProviderType } from '@lib/core';
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

  public async discover(
    providerId: ProviderId,
  ): Promise<DiscoveredDataSource[]> {
    const dataProvider = await this.dataProviderRepository.getById(providerId);
    if (!dataProvider) {
      throw new Error(`DataProvider with id ${providerId} not found`);
    }
    this.logger.debug(`Discovering data for ${dataProvider.type}`);
    const dataDiscoverer = this.dataDiscovererFactory.get(dataProvider.type);
    const discoveredDataSources: DiscoveredDataSource[] =
      await dataDiscoverer.discover(dataProvider.config);
    return discoveredDataSources;
  }

  public async discoverByConfig(
    providerType: ProviderType,
    config: ProviderConfig,
  ): Promise<DiscoveredDataSource[]> {
    this.logger.debug(`discoverByConfig(): Config = ${JSON.stringify(config)}`);
    const dataDiscoverer = this.dataDiscovererFactory.get(providerType);
    const discoveredDataSources: DiscoveredDataSource[] =
      await dataDiscoverer.discover(config);
    return discoveredDataSources;
  }

  public async check(
    providerType: ProviderType,
    config: ProviderConfig,
  ): Promise<void> {
    this.logger.debug(`Config = ${JSON.stringify(config)}`);
    const dataDiscoverer = this.dataDiscovererFactory.get(providerType);
    await dataDiscoverer.check(config);
  }
}
