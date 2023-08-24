import { Module } from '@nestjs/common';
import { DataDiscovererFactory } from './data-discoverer.factory';
import { DataDiscovererService } from './discoverer.service';
import { DiscovererProviders } from './discoverer.provider';
import { GoogleModule, MicrosoftModule } from '@lib/modules/third-party';
import { RepositoryModule } from '@lib/modules';

@Module({
  imports: [RepositoryModule.registerAsync(), MicrosoftModule, GoogleModule],
  controllers: [],
  providers: [
    ...DiscovererProviders,
    DataDiscovererFactory,
    DataDiscovererService,
  ],
  exports: [DataDiscovererService],
})
export class DiscovererModule {}
