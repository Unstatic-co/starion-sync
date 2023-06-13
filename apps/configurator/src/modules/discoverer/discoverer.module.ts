import { Module } from '@nestjs/common';
import { DataDiscovererFactory } from './data-discoverer.factory';
import { DataDiscovererService } from './discoverer.service';
import { DiscovererProviders } from './discoverer.provider';
import { MicrosoftModule } from '@lib/modules/third-party';
import { RepositoryModule } from '@lib/modules';

@Module({
  imports: [MicrosoftModule, RepositoryModule.registerAsync()],
  controllers: [],
  providers: [
    ...DiscovererProviders,
    DataDiscovererFactory,
    DataDiscovererService,
  ],
  exports: [DataDiscovererService],
})
export class DiscovererModule {}
