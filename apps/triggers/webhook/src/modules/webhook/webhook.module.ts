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

export const WebhookProviders = [
  GoogleSheetsWebhookService,
  GoogleSheetsWebhookJobProcessor,
];

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.GOOGLE_SHEETS_WEBHOOK_REFRESH,
    }),
    ConfigModule,
    RepositoryModule.registerAsync(),
    GoogleModule,
  ],
  controllers: [],
  providers: [...WebhookProviders, WebhookServiceFactory],
  exports: [...WebhookProviders, WebhookServiceFactory],
})
export class WebhookModule {}
