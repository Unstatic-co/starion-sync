import { Module, forwardRef } from '@nestjs/common';
import { TriggerService } from './trigger.service';
import { RepositoryModule } from '@lib/modules';
import { BrokerModule } from '../broker/broker.module';
import { TriggerController } from './trigger.controller';
import { WebhookModule } from '../webhook/webhook.module';

@Module({
  imports: [
    RepositoryModule.registerAsync(),
    forwardRef(() => BrokerModule),
    WebhookModule,
  ],
  controllers: [TriggerController],
  providers: [TriggerService],
  exports: [TriggerService],
})
export class TriggerModule {}
