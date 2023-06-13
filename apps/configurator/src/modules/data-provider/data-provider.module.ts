import { Module } from '@nestjs/common';
import { DataProviderController } from './data-provider.controller';
import { RepositoryModule } from '@lib/modules/repository';
import { DataProviderService } from './data-provider.service';
import { DataProviderServiceProvider } from './data-provider.provider';
import { DiscovererModule } from '../discoverer';

@Module({
  imports: [RepositoryModule.registerAsync(), DiscovererModule],
  controllers: [DataProviderController],
  providers: [DataProviderServiceProvider],
  exports: [DataProviderService],
})
export class DataProviderModule {}
