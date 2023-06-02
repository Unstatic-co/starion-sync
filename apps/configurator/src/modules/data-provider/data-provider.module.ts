import { Module } from '@nestjs/common';
import { DataProviderService } from './data-provider.service';
import { DataProviderController } from './data-provider.controller';
import { RepositoryModule } from '@lib/modules/repository';

@Module({
  imports: [RepositoryModule.registerAsync()],
  controllers: [DataProviderController],
  providers: [DataProviderService],
  exports: [DataProviderService],
})
export class DataProviderModule {}
