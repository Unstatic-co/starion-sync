import { BrokerProvider } from '@lib/modules/broker/broker.provider';
import { Module, forwardRef } from '@nestjs/common';
import { BrokerController } from './broker.controller';
import { BrokerService } from './broker.service';
import { WebhookModule } from '../webhook/webhook.module';

@Module({
  imports: [forwardRef(() => WebhookModule)],
  providers: [BrokerProvider, BrokerService],
  controllers: [BrokerController],
  exports: [BrokerProvider, BrokerService],
})
export class BrokerModule {}
