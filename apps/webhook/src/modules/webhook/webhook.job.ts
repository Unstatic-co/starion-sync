import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { QUEUES } from '../../common/queues';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { IWebhookRepository, InjectTokens } from '@lib/modules';
import { WebhookService } from './webhook.service';
import { WebhookId, WebhookPayload } from '@lib/core';

export type WebhookExecutionData = {
  webhookId: WebhookId;
  payload: WebhookPayload;
};

@Processor(QUEUES.WEBHOOK_EXECUTION)
@Injectable()
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    @Inject(InjectTokens.WEBHOOK_REPOSITORY)
    private readonly webhookRepository: IWebhookRepository,
    private readonly webhookService: WebhookService,
  ) {}

  @Process()
  async process(job: Job<WebhookExecutionData>) {
    return this.webhookService.executeWebhook(
      job.data.webhookId,
      job.data.payload,
    );
  }
}
