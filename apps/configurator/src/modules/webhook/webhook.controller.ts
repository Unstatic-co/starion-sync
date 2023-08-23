import { Controller, Post, Param, Body } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { CreateWebhookDto, CreateWebhooksDto } from './dto/createWebhook.dto';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  async create(@Body() data: CreateWebhookDto) {
    return this.webhookService.create(data);
  }

  @Post('bulk')
  async bulkCreate(@Body() data: CreateWebhooksDto) {
    return this.webhookService.bulkCreate(data);
  }
}
