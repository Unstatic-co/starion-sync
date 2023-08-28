import { TriggerNames } from '@lib/core';
import { Injectable } from '@nestjs/common';
import { GoogleSheetsWebhookService } from './google-sheets';
import { WebhookService } from './webhook.service';

@Injectable()
export class WebhookServiceFactory {
  constructor(
    private readonly googleSheetsWebhookService: GoogleSheetsWebhookService,
  ) {}

  public get(triggerName: string): WebhookService {
    switch (triggerName) {
      case TriggerNames.GOOGLE_SHEETS_WEBHOOK:
        return this.googleSheetsWebhookService;
      default:
        throw new Error('Unknown webhook');
    }
  }
}
