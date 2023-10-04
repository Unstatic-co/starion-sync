import { RepositoryModule } from '@lib/modules';
import { Module } from '@nestjs/common';
import { CleanerModule } from '../cleaner/cleaner.module';
import { DataSourceService } from './dataSource.service';

@Module({
  imports: [RepositoryModule.registerAsync(), CleanerModule],
  controllers: [],
  providers: [DataSourceService],
  exports: [DataSourceService],
})
export class DataSourceModule {}
