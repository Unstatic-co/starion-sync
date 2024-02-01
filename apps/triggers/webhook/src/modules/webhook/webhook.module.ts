import { GoogleModule, RepositoryModule } from '@lib/modules';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  GoogleSheetsWebhookJobProcessor,
  GoogleSheetsWebhookService,
} from './google-sheets';
import { WebhookServiceFactory } from './webhook.factory';
import { BullModule } from '@nestjs/bull';
import { QUEUES } from '../../common/queues';
import { WebhookController } from './webhook.controller';

export const WebhookProviders = [
  GoogleSheetsWebhookService,
  GoogleSheetsWebhookJobProcessor,
];

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.GOOGLE_SHEETS_WEBHOOK_REFRESH,
      defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
    }),
    ConfigModule,
    RepositoryModule.registerAsync(),
    GoogleModule,
  ],
  controllers: [WebhookController],
  providers: [...WebhookProviders, WebhookServiceFactory],
  exports: [...WebhookProviders, WebhookServiceFactory],
})
export class WebhookModule {}
