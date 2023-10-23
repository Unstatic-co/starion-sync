import { BrokerProvider } from '@lib/modules/broker/broker.provider';
import { Module, forwardRef } from '@nestjs/common';
import { BrokerController } from './broker.controller';
import { BrokerService } from './broker.service';
import { SyncflowModule } from '../syncflow/syncflow.module';
import { DataSourceModule } from '../data-source/dataSource.module';

@Module({
  imports: [forwardRef(() => SyncflowModule), DataSourceModule],
  providers: [BrokerProvider, BrokerService],
  controllers: [BrokerController],
  exports: [BrokerProvider, BrokerService],
})
export class BrokerModule {}
