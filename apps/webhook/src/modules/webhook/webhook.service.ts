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
  DataSourceDeletedPayload,
  DataSourceErrorPayload,
  DataSourceId,
  EventName,
  EventNames,
  EventPayload,
  SyncflowCompletedPayload,
  SyncflowFailedPayload,
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
  DataSourceDeletedWebhookPayload,
  DataSourceErrorWebhookPayload,
  SyncConnectionCreatedWebhookPayload,
  SyncflowCompletedWebhookPayload,
  SyncflowFailedWebhookPayload,
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
        dataSourceId = syncflowSucceedPayload.dataSourceId;
        webhookPayload = {
          syncflowId: syncflowSucceedPayload.syncflowId,
          dataSourceId,
          syncVersion: syncflowSucceedPayload.syncVersion,
          statistics: syncflowSucceedPayload.statistics,
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

      case EventNames.SYNCFLOW_FAILED:
        const syncflowFailedPayload = eventPayload as SyncflowFailedPayload;
        webhookType = WebhookType.SYNCFLOW_FAILED;
        dataSourceId = syncflowFailedPayload.dataSourceId;
        webhookPayload = {
          syncflowId: syncflowFailedPayload.syncflowId,
          dataSourceId,
          syncVersion: syncflowFailedPayload.syncVersion,
          error: {
            type: syncflowFailedPayload.error.type,
            code: syncflowFailedPayload.error.code,
            message: syncflowFailedPayload.error.message,
          },
        } as SyncflowFailedWebhookPayload;
        break;

      case EventNames.DATA_SOURCE_DELETED:
        const dataSourceDeletedPayload =
          eventPayload as DataSourceDeletedPayload;
        webhookType = WebhookType.DATA_SOURCE_DELETED;
        dataSourceId = dataSourceDeletedPayload.dataSourceId;
        webhookPayload = {
          dataSourceId,
          syncConnectionId: dataSourceDeletedPayload.syncConnectionId,
        } as DataSourceDeletedWebhookPayload;
        break;

      case EventNames.DATA_SOURCE_ERROR:
        const dataSourceErrorPayload = eventPayload as DataSourceErrorPayload;
        webhookType = WebhookType.DATA_SOURCE_ERROR;
        dataSourceId = dataSourceErrorPayload.dataSourceId;
        webhookPayload = {
          dataSourceId,
          code: dataSourceErrorPayload.code,
          message: dataSourceErrorPayload.message,
        } as DataSourceErrorWebhookPayload;
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
    let privateKey = this.configService.get<WebhookConfig>(
      ConfigName.WEBHOOK,
    ).privateKey;
    privateKey =
      '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDP2yBStuVi2fIQvv1tFh0VvyGvZIhLrhA/JoDnO3Cp2psh5UHXssLntj3wQY+eyrDhEPAj0bq9LT8xCBlFKOmv1oojtx0uTNudFTFFgluQA2f4y/91HqCh9QL26lu1mNUx/Tx5NSUlZjdp2gEMD84+8d+eYzbUOzlsqlNHYicHz/o04l1XzEWZ0dLiEaYas4FI9Rlu+aa5oXLS+Mbn6tift+L/EC0hD4V6flRz/HH3kCnYDPOJ/m2UjY22gimvW/aTl2j1WZWYgqyTlIu9YCG548lrOIXFFCwsxHrcwMzM8DoPdKx5HVxR2I1cJ4KhmIgwqBNcP7yuwk0JCNJmiQbNAgMBAAECggEAG4W/326hVrgA0fqAKGrLr3P5/AqbSNjDr6D5DjqJfgGDa3cQWK/ZGAEXwtGOOK/3wNgofA21eimHcFt1Vnoxi0YkpNBb2E7MAPOWl8Ydj/xWJD8Ff0Fux/3fMR5cxgx2emKLmIm9dpjKJfAnFazyxH9BesGst73J1PDZYHPc3YSNQIzP/4F2rhGn7fFkWu06Bsj2nY6/J0L7HLHKAdJ1GvV2K/zoiv2GEsZKvOPa24ofo+eYYfwccZ1+09wnfxuBo1f9Qva80Hc3MTHgiQwG3BVdnmV5KuL+DUX2sqWokfhqEnHrmtaoPK3M0fsU3T6fTiXEnrSK/ectUyKAvCjL/wKBgQD92tZ+exjXiGawIHkBrvTK17kPH8vQYxKvDL6/xB0ggKrL1okyV0aqpQJVB2bW0Qf8zxxpFDCx6gtZ0ML6FU2zfJ0xpG/k1dRELCs9KvH4yyDRkK9Ld2XWDB4XfTTA3y3LuOfOVgLE/PmKSzXFFG0LrcGGgALG4CDaMB3jMFEVWwKBgQDRnMeGw65ETeTz+HPkAnDRb1UBaMyhyGafjq4kALV8m0pR2JVmR/D5OvH/yt65t1IZ6HAbaccIncBfJ3+604wN+URGG2Tmln+hVSdIdTLNhbLsfkBBqbuBWkTPtdrYgXL0nlM47U1UZlvgqQ5y7iXoyOcqsYRETLNl2R1TNWgE9wKBgH8VlDYDmB8mmQnpZ8rQ9Jmrv2hz6YvsXUknH0NPgalo4JhlUY/TI3yAWReKOhCm2tHUOYvdYLdgzMfs+/9ItPp7ExLsGFw+NCLg3dCkdDiyMD7ZqPgl0OSEcngd5U/9KqcHbXzdkEtfvele149PN3wWQ4D7CujXAXtZhUzcPmtrAoGAQ3XVsUWg/FKlcO9xPNycOos+LGnyEc9RV+Cvot6niibgUF8IFhbpMw0JfW1pKRQa1EO+cNQmPlum4fjwXsxestCabIW8f4nIIcAqGGO/qe1xnDM1suxRcFwA8WhxumRO/vNFjXix/ovC3hcKk2qZwMWHwHHJQ8H7qrepfHIfvBkCgYBYrO2h24uke0fVFgy5CJErjV9S7yymPgJBv4LePctisAspnFL83T+NODIZGqb9aq4woYfJAT6BoAKuWGrCOp6rvalb+b7OfhYf74l/fozfYx5NsCqyCucATy6y6tarsk1bfRGoS5Nu/dJxpckKk+6EGPk6PZLQyLtkfkcNylXz0A==\n-----END PRIVATE KEY-----'
        .split(String.raw`\n`)
        .join('\n');
    const signature = signer.sign(privateKey, 'base64');
    return signature;
  }
}
