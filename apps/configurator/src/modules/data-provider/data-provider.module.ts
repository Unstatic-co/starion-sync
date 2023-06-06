import { Module, Scope } from '@nestjs/common';
import { DataProviderController } from './data-provider.controller';
import {
  DATA_PROVIDER_REPOSITORY,
  IDataProviderRepository,
  RepositoryModule,
} from '@lib/modules/repository';
import { REQUEST } from '@nestjs/core';
import { ProviderType } from '@lib/core';
import { GoogleSheetsDataProviderService } from './google-sheets';
import {
  DataProviderService,
  DefaultDataProviderService,
} from './data-provider.service';
import { DataProviderServiceProvider } from './data-provider.provider';
import { DataDiscovererFactory } from './discoverer';

@Module({
  imports: [RepositoryModule.registerAsync()],
  controllers: [DataProviderController],
  providers: [DataProviderServiceProvider, DataDiscovererFactory],
  exports: [DataProviderService],
})
export class DataProviderModule {}
