import { RepositoryModule } from '@lib/modules/repository';
import { Module, forwardRef } from '@nestjs/common';
import { DataSourceModule } from '../data-source/data-source.module';
import { DataProviderModule } from '../data-provider/data-provider.module';
import { SyncConnectionController } from './syncConnection.controller';
import { SyncConnectionService } from './syncConection.service';

@Module({
  imports: [
    RepositoryModule.registerAsync(),
    DataProviderModule,
    forwardRef(() => DataSourceModule),
  ],
  controllers: [SyncConnectionController],
  providers: [SyncConnectionService],
  exports: [SyncConnectionService],
})
export class SyncConnectionModule {}
