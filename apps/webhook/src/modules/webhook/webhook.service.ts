import { ConfigName } from '@lib/core/config';
import {
  IDataSourceRepository,
  IWebhookRepository,
  InjectTokens,
} from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrokerService } from '../broker/broker.service';
import {
  ConnectionCreatedPayload,
  EventName,
  EventNames,
  EventPayload,
  WebhookPayload,
  WebhookStatus,
  WebhookType,
} from '@lib/core';
import axios from 'axios';
import * as crypto from 'crypto';
import { WebhookConfig } from 'apps/webhook/src/config/webhook.config';
import { InjectQueue } from '@nestjs/bull';
import { QUEUES } from '../../common/queues';
import Bull, { Queue } from 'bull';
import { WebhookExecutionData } from './webhook.job';
import { SyncConnectionCreatedWebhookPayload } from './webhook.payload';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectQueue(QUEUES.WEBHOOK_EXECUTION)
    private readonly webhookExecutionQueue: Queue,
    @Inject(InjectTokens.WEBHOOK_REPOSITORY)
    private readonly webhookRepository: IWebhookRepository,
    @Inject(InjectTokens.DATA_SOURCE_REPOSITORY)
    private readonly dataSourceRepository: IDataSourceRepository,
    private readonly configService: ConfigService,
    private readonly brokerService: BrokerService,
  ) {}

  async addWebhookExecution(eventName: EventName, eventPayload: EventPayload) {
    this.logger.log(`add webhook execution for event ${eventName}`);
    let webhookType: WebhookType;
    let webhookPayload: WebhookPayload;
    switch (eventName) {
      case EventNames.CONNECTION_CREATED:
        webhookType = WebhookType.SYNC_CONNECTION_CREATED;
        const dataSourceId = (eventPayload as ConnectionCreatedPayload)
          .sourceId;
        const dataSource = await this.dataSourceRepository.getById(
          dataSourceId,
        );
        if (!dataSource) {
          this.logger.warn(`Data source not found: ${dataSourceId}`);
          return;
        }
        webhookPayload = {
          dataProvider: dataSource.provider.type,
          dataSourceId: dataSource.id,
          dataSourceConfig: dataSource.config,
        } as SyncConnectionCreatedWebhookPayload;
        break;
      default:
        throw new Error(`Unsupported event: ${eventName}`);
    }

    const webhooks = await this.webhookRepository.getActiveWebhooksByType(
      webhookType,
    );
    if (!webhooks.length) {
      this.logger.debug(`no webhooks found for event ${eventName}`);
      return;
    }

    const webhookJobs = webhooks.map(
      (webhook) =>
        ({
          data: {
            webhookId: webhook.id,
            payload: webhookPayload,
          },
          opts: {
            jobId: webhook.id,
            timeout: 10000,
            attempts: 5,
            removeOnComplete: true,
            removeOnFail: true,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          },
        } as Bull.Job<WebhookExecutionData>),
    );
    await this.webhookExecutionQueue.addBulk(webhookJobs);
    this.logger.log(
      `added ${webhookJobs.length} webhook execution for event ${eventName}`,
    );
  }

  async executeWebhook(webhookId: string, payload: WebhookPayload) {
    this.logger.debug(`execute webhook ${webhookId}`);
    const webhook = await this.webhookRepository.getById(webhookId);
    if (!webhook) {
      this.logger.warn(`Webhook not found: ${webhookId}`);
      return;
    }
    if (webhook.status === WebhookStatus.INACTIVE) {
      this.logger.warn(`Webhook is inactive: ${webhookId}`);
      return;
    }

    // add timestamp
    payload.timestamp = new Date();

    try {
      await axios.post(webhook.url, payload, {
        headers: {
          'X-Signature': this.signPayload(payload),
        },
      });
    } catch (error) {
      this.logger.log(`Execute webhook ${webhookId} error: ${error.message}`);
      throw error;
    }
    this.logger.log(`Execute webhook ${webhookId} success`);
  }

  private signPayload(payload: WebhookPayload) {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(JSON.stringify(payload));
    const privateKey = this.configService.get<WebhookConfig>(
      ConfigName.WEBHOOK,
    ).privateKey;
    const signature = signer.sign(privateKey, 'base64');
    return signature;
  }
}
