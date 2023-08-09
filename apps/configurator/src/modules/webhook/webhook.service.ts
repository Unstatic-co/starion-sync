import { IWebhookRepository, InjectTokens } from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateWebhookDto } from './dto/createWebhook.dto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(InjectTokens.WEBHOOK_REPOSITORY)
    private readonly webhookRepository: IWebhookRepository,
  ) {}

  async create(data: CreateWebhookDto) {
    await this.webhookRepository.create(data);
  }
}
