import { REQUEST } from '@nestjs/core';
import { IDataProviderRepository } from '@lib/modules/repository';
import {
  IDataProviderService,
  DataProviderService,
} from './data-provider.service';
import { ProviderType } from '@lib/core';
import { Scope } from '@nestjs/common';
import { InjectTokens } from '@lib/modules';
import { DataDiscovererService } from '../discoverer/discoverer.service';

export const DataProviderServiceProvider = {
  provide: DataProviderService,
  inject: [
    REQUEST,
    InjectTokens.DATA_PROVIDER_REPOSITORY,
    DataDiscovererService,
  ],
  useFactory: (
    request: any,
    dataProviderRepository: IDataProviderRepository,
    dataDiscovererService: DataDiscovererService,
  ) => {
    const { dataProviderType } = request;
    switch (dataProviderType) {
      case ProviderType.GOOGLE_SHEETS:
        return new DataProviderService(
          dataProviderRepository,
          dataDiscovererService,
        );
      default:
        return new DataProviderService(
          dataProviderRepository,
          dataDiscovererService,
        );
    }
  },
  scope: Scope.REQUEST,
  durable: true,
};
