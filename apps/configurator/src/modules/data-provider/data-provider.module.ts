import { Module } from '@nestjs/common';
import { DataProviderController } from './data-provider.controller';
import { RepositoryModule } from '@lib/modules/repository';
import { DataProviderService } from './data-provider.service';
import { DataProviderServiceProvider } from './data-provider.provider';
import { DataDiscovererFactory } from './discoverer';

@Module({
  imports: [RepositoryModule.registerAsync()],
  controllers: [DataProviderController],
  providers: [DataProviderServiceProvider, DataDiscovererFactory],
  exports: [DataProviderService],
})
export class DataProviderModule {}
