import { RepositoryModule } from '@lib/modules/repository';
import { Module } from '@nestjs/common';
import { DataSourceController } from './data-source.controller';
import { DataSourceService } from './data-source.service';
import { DataProviderModule } from '../data-provider/data-provider.module';

@Module({
  imports: [RepositoryModule.registerAsync(), DataProviderModule],
  controllers: [DataSourceController],
  providers: [DataSourceService],
  exports: [DataSourceService],
})
export class DataSourceModule {}
