import { RepositoryModule } from '@lib/modules';
import { Module } from '@nestjs/common';
import { CleanerService } from './cleaner.service';
import { MicrosoftExcelCleanerService } from './excel';
import { CleanerFactory } from './cleaner.factory';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [RepositoryModule.registerAsync(), StorageModule],
  controllers: [],
  providers: [CleanerService, CleanerFactory, MicrosoftExcelCleanerService],
  exports: [CleanerService, CleanerFactory],
})
export class CleanerModule {}
