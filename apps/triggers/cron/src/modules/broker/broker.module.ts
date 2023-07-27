import { BrokerProvider } from '@lib/modules/broker/broker.provider';
import { Module, forwardRef } from '@nestjs/common';
import { BrokerController } from './broker.controller';
import { BrokerService } from './broker.service';
import { TriggerModule } from '../trigger/trigger.module';

@Module({
  imports: [forwardRef(() => TriggerModule)],
  providers: [BrokerProvider, BrokerService],
  controllers: [BrokerController],
  exports: [BrokerProvider, BrokerService],
})
export class BrokerModule {}
