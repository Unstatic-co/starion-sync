import { Module } from '@nestjs/common';
import { RepositoryModule } from '@lib/modules';
import { DataSourceService } from './datasource.service';

@Module({
  imports: [RepositoryModule.registerAsync()],
  providers: [DataSourceService],
  exports: [DataSourceService],
})
export class DataSourceModule {}
