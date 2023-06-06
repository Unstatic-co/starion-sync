import { REQUEST } from '@nestjs/core';
import {
  DATA_PROVIDER_REPOSITORY,
  IDataProviderRepository,
} from '@lib/modules/repository';
import { GoogleSheetsDataProviderService } from './google-sheets';
import {
  DataProviderService,
  DefaultDataProviderService,
} from './data-provider.service';
import { ProviderType } from '@lib/core';
import { Scope } from '@nestjs/common';

export const DataProviderServiceProvider = {
  provide: DataProviderService,
  inject: [REQUEST, DATA_PROVIDER_REPOSITORY],
  useFactory: (
    request: any,
    dataProviderRepository: IDataProviderRepository,
  ) => {
    const { dataProviderType } = request;
    switch (dataProviderType) {
      case ProviderType.GOOGLE_SHEETS:
        return new GoogleSheetsDataProviderService(
          request,
          dataProviderRepository,
        );
      default:
        return new DefaultDataProviderService(dataProviderRepository);
    }
  },
  scope: Scope.REQUEST,
  durable: true,
};
