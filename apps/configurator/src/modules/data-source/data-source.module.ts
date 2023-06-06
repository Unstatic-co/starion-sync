import { RepositoryModule } from '@lib/modules/repository';
import { Module } from '@nestjs/common';
import { DataSourceController } from './data-source.controller';
import { DataSourceService } from './data-source.service';

@Module({
  imports: [RepositoryModule.registerAsync()],
  controllers: [DataSourceController],
  providers: [DataSourceService],
  exports: [DataSourceService],
})
export class DataSourceModule {}
