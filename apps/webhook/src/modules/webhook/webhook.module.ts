import { WebhookProcessor } from './webhook.job';
import { Module, forwardRef } from '@nestjs/common';
import { RepositoryModule } from '@lib/modules';
import { BrokerModule } from '../broker/broker.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { QUEUES } from '../../common/queues';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.WEBHOOK_EXECUTION,
    }),
    RepositoryModule.registerAsync(),
    forwardRef(() => BrokerModule),
  ],
  controllers: [WebhookController],
  providers: [WebhookProcessor, WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
