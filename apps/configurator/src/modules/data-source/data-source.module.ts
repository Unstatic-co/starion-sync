import { RepositoryModule } from '@lib/modules/repository';
import { Module, forwardRef } from '@nestjs/common';
import { DataSourceController } from './data-source.controller';
import { DataSourceService } from './data-source.service';
import { DataProviderModule } from '../data-provider/data-provider.module';
import { SyncConnectionModule } from '../sync-connection/syncConnection.module';
import { WorkflowModule } from '../workflow/worflow.module';
import { DestinationDatabaseModule, OrchestratorModule } from '@lib/modules';

@Module({
  imports: [
    RepositoryModule.registerAsync(),
    DestinationDatabaseModule.register(),
    WorkflowModule,
    DataProviderModule,
    forwardRef(() => SyncConnectionModule),
    OrchestratorModule,
  ],
  controllers: [DataSourceController],
  providers: [DataSourceService],
  exports: [DataSourceService],
})
export class DataSourceModule {}
