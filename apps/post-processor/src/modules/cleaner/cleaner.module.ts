import { RepositoryModule } from '@lib/modules';
import { Module } from '@nestjs/common';
import { CleanerService } from './cleaner.service';
import { MicrosoftExcelCleanerService } from './excel';
import { CleanerFactory } from './cleaner.factory';

@Module({
  imports: [RepositoryModule.registerAsync()],
  controllers: [],
  providers: [CleanerService, CleanerFactory, MicrosoftExcelCleanerService],
  exports: [CleanerService, CleanerFactory],
})
export class CleanerModule {}
