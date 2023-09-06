import { RepositoryModule } from '@lib/modules';
import { Module, forwardRef } from '@nestjs/common';
import { CleanerModule } from '../cleaner/cleaner.module';
import { SyncflowService } from './syncflow.service';
import { BrokerModule } from '../broker/broker.module';

@Module({
  imports: [
    RepositoryModule.registerAsync(),
    CleanerModule,
    forwardRef(() => BrokerModule),
  ],
  controllers: [],
  providers: [SyncflowService],
  exports: [SyncflowService],
})
export class SyncflowModule {}
