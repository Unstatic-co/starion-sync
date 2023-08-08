import { Module } from '@nestjs/common';
import { RepositoryModule } from '@lib/modules';
import { BrokerModule } from '../broker/broker.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  imports: [RepositoryModule.registerAsync(), BrokerModule],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
