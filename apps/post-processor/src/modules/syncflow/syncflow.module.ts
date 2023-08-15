import { RepositoryModule } from '@lib/modules';
import { Module } from '@nestjs/common';
import { CleanerModule } from '../cleaner/cleaner.module';
import { SyncflowService } from './syncflow.service';

@Module({
  imports: [RepositoryModule.registerAsync(), CleanerModule],
  controllers: [],
  providers: [SyncflowService],
  exports: [SyncflowService],
})
export class SyncflowModule {}
