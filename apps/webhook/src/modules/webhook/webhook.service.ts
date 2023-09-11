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
  DataSourceId,
  EventName,
  EventNames,
  EventPayload,
  SyncflowCompletedPayload,
  SyncflowScheduledPayload,
  SyncflowSucceedPayload,
  WebhookPayload,
  WebhookScope,
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
import {
  SyncConnectionCreatedWebhookPayload,
  SyncflowCompletedWebhookPayload,
  SyncflowScheduledWebhookPayload,
  SyncflowSucceedWebhookPayload,
} from './webhook.payload';

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

  async addWebhookExecution(
    eventName: EventName,
    eventPayload: EventPayload,
    options?: {
      assure?: boolean;
    },
  ) {
    this.logger.log(`add webhook execution for event ${eventName}`);
    let webhookType: WebhookType;
    let webhookPayload: WebhookPayload;
    let dataSourceId: DataSourceId;
    switch (eventName) {
      case EventNames.CONNECTION_CREATED:
        webhookType = WebhookType.SYNC_CONNECTION_CREATED;
        dataSourceId = (eventPayload as ConnectionCreatedPayload).sourceId;
        const dataSource = await this.dataSourceRepository.getById(
          dataSourceId,
          { includeDeleted: true },
        );
        if (!dataSource) {
          this.logger.warn(
            `DataSource not found: ${dataSourceId}, event ${eventName}`,
          );
          return;
        }
        webhookPayload = {
          dataProvider: dataSource.provider.type,
          dataSourceId,
          dataSourceConfig: dataSource.config,
        } as SyncConnectionCreatedWebhookPayload;
        break;

      case EventNames.SYNCFLOW_SCHEDULED:
        const synflowScheduledPayload =
          eventPayload as SyncflowScheduledPayload;
        webhookType = WebhookType.SYNCFLOW_SCHEDULED;
        dataSourceId = synflowScheduledPayload.syncflow.sourceId;
        webhookPayload = {
          syncflowId: synflowScheduledPayload.syncflow.id,
          syncVersion: synflowScheduledPayload.syncflow.state.version,
          dataSourceId,
        } as SyncflowScheduledWebhookPayload;
        break;

      case EventNames.SYNCFLOW_SUCCEED:
        const syncflowSucceedPayload = eventPayload as SyncflowSucceedPayload;
        webhookType = WebhookType.SYNCFLOW_SUCCEED;
        const { syncflowId, statistics } = syncflowSucceedPayload;
        dataSourceId = syncflowSucceedPayload.dataSourceId;
        webhookPayload = {
          syncflowId,
          dataSourceId,
          syncVersion: syncflowSucceedPayload.syncVersion,
          statistics,
        } as SyncflowSucceedWebhookPayload;
        break;

      case EventNames.SYNCFLOW_COMPLETED:
        const syncflowCompletedPayload =
          eventPayload as SyncflowCompletedPayload;
        webhookType = WebhookType.SYNCFLOW_COMPLETED;
        dataSourceId = syncflowCompletedPayload.dataSourceId;
        webhookPayload = {
          syncflowId: syncflowCompletedPayload.syncflowId,
          syncVersion: syncflowCompletedPayload.syncVersion,
          dataSourceId,
          rowsNumber: syncflowCompletedPayload.rowsNumber,
        } as SyncflowCompletedWebhookPayload;
        break;

      default:
        throw new Error(`Unsupported event: ${eventName}`);
    }

    const globalWebhookQuery = this.webhookRepository.getActiveWebhooksByType({
      type: webhookType,
      scope: WebhookScope.GLOBAL,
    });
    const dataSourceWebhookQuery =
      this.webhookRepository.getActiveWebhooksByType({
        type: webhookType,
        scope: WebhookScope.DATA_SOURCE,
        dataSourceId,
      });
    const [globalWebhooks, dataSourceWebhooks] = await Promise.all([
      globalWebhookQuery,
      dataSourceWebhookQuery,
    ]);
    const webhooks = [...globalWebhooks, ...dataSourceWebhooks];

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
            attempts: options?.assure ? 100000 : 5,
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

    // add timestamp & metadata
    payload.timestamp = new Date();
    if (webhook.metadata) {
      payload.metadata = webhook.metadata;
    }

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
