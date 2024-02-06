import { Controller, Logger, Param, Post } from '@nestjs/common';
import { GoogleSheetsWebhookService } from './google-sheets';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly googleSheetsWebhookService: GoogleSheetsWebhookService,
  ) {}

  @Post('/google-sheets/:triggerId/refreshment')
  async refreshWebhookGoogleSheets(@Param('triggerId') triggerId: string) {
    return this.googleSheetsWebhookService.refreshWebhook(triggerId);
  }
}
