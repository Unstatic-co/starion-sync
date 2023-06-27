import { BrokerProvider } from '@lib/modules/broker/broker.provider';
import { Module } from '@nestjs/common';
import { BrokerController } from './broker.controller';
import { BrokerService } from './broker.service';
import { OrchestratorModule } from '@lib/modules';

@Module({
  imports: [OrchestratorModule],
  providers: [BrokerProvider, BrokerService],
  controllers: [BrokerController],
  exports: [BrokerProvider, BrokerService],
})
export class BrokerModule {}
