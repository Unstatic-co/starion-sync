import { RepositoryModule } from '@lib/modules/repository';
import { Module, forwardRef } from '@nestjs/common';
import { DataSourceModule } from '../data-source/data-source.module';
import { DataProviderModule } from '../data-provider/data-provider.module';
import { SyncConnectionController } from './syncConnection.controller';
import { SyncConnectionService } from './syncConection.service';
import { WorkflowModule } from '../workflow/worflow.module';
import { TriggerModule } from '../trigger/trigger.module';
import { OrchestratorModule } from '@lib/modules';

@Module({
  imports: [
    RepositoryModule.registerAsync(),
    WorkflowModule,
    DataProviderModule,
    forwardRef(() => DataSourceModule),
    TriggerModule,
    OrchestratorModule,
  ],
  controllers: [SyncConnectionController],
  providers: [SyncConnectionService],
  exports: [SyncConnectionService],
})
export class SyncConnectionModule {}
