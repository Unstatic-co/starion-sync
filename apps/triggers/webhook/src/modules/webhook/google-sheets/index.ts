import {
  DataSource,
  GoogleSheetsDataSourceConfig,
  Trigger,
  TriggerId,
} from '@lib/core';
import {
  GoogleService,
  GoogleSheetsService,
  IDataSourceRepository,
  ISyncflowRepository,
  ITriggerRepository,
  InjectTokens,
} from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GOOGLE_SHEETS_WEBHOOK_EXPIRATION } from '../../../common/constants';
import { v4 as uuidv4 } from 'uuid';
import { WebhookService } from '../webhook.service';
import {
  InjectQueue,
  OnQueueCompleted,
  OnQueueFailed,
  Process,
  Processor,
} from '@nestjs/bull';
import { QUEUES } from '../../../common/queues';
import { Job, Queue } from 'bull';
import { ConfigName } from '@lib/core/config';

type GoogleSheetsWebhookRefreshmentJobData = {
  triggerId: TriggerId;
};

@Injectable()
export class GoogleSheetsWebhookService implements WebhookService {
  private readonly logger = new Logger(GoogleSheetsWebhookService.name);

  constructor(
    @InjectQueue(QUEUES.GOOGLE_SHEETS_WEBHOOK_REFRESH)
    private readonly refreshmentQueue: Queue,
    @Inject(InjectTokens.TRIGGER_REPOSITORY)
    private readonly triggerRepository: ITriggerRepository,
    private readonly configService: ConfigService,
    private readonly googleService: GoogleService,
    private readonly googleSheetsService: GoogleSheetsService,
  ) {}

  async createWebhook(data: { trigger: Trigger; dataSource: DataSource }) {
    const { trigger } = data;

    await this.create(data);

    this.logger.debug(`add refreshment job, triggerId = ${trigger.id}`);
    let refreshInterval = (GOOGLE_SHEETS_WEBHOOK_EXPIRATION - 1800) * 1000;
    if (
      this.configService.get<string>(`${ConfigName.APP}.environment`) !==
      'production'
    ) {
      refreshInterval = 1600 * 1000;
    }
    await this.refreshmentQueue.add(
      {
        triggerId: trigger.id,
      } as GoogleSheetsWebhookRefreshmentJobData,
      {
        jobId: trigger.id,
        timeout: 10000,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        repeat: {
          every: refreshInterval,
        },
      },
    );
    await this.triggerRepository.updateConfig(trigger.id, {
      refreshInterval,
    });

    this.logger.log(`created google sheets webhook, triggerId = ${trigger.id}`);
  }

  async stopWebhook(data: {
    trigger: Trigger;
    dataSource: DataSource;
  }): Promise<void> {
    const { trigger } = data;
    try {
      await this.stop(data);
    } catch (error) {
      this.logger.warn(
        `failed to stop google sheets webhook, triggerId = ${trigger.id}, error = ${error.message}`,
      );
    }

    this.logger.log(`remove refreshment job, jobId = ${trigger.id}`);
    await this.refreshmentQueue.removeRepeatable({
      jobId: trigger.id,
      every: trigger.config.refreshInterval,
    });
    this.logger.log(`removed refreshment job, jobId = ${trigger.id}`);
  }

  async create(data: { trigger: Trigger; dataSource: DataSource }) {
    const { trigger, dataSource } = data;
    this.logger.log(`create google sheets webhook, triggerId = ${trigger.id}`);
    const dataSourceConfig = dataSource.config as GoogleSheetsDataSourceConfig;
    const refreshToken = dataSourceConfig.auth.refreshToken;
    const webhookBaseUrl = this.configService.get<string>('webhook.baseUrl');

    const webhookId = uuidv4();
    let expiration = Date.now() + GOOGLE_SHEETS_WEBHOOK_EXPIRATION * 1000;
    if (
      this.configService.get<string>(`${ConfigName.APP}.environment`) ==
      'development'
    ) {
      expiration = Date.now() + 1800 * 1000;
    }
    const client = await this.googleService.createAuthClient(refreshToken);
    const { channelId, resourceId } =
      await this.googleSheetsService.registerFileChangeWebhook({
        client,
        webhookId,
        fileId: dataSourceConfig.spreadsheetId,
        webhookUrl: `${webhookBaseUrl}/triggers/google-sheets/${trigger.id}`,
        expiration,
        params: {
          triggerId: trigger.id,
        },
      });
    this.logger.debug(
      `created google sheets webhook, channelId = ${channelId}, resourceId = ${resourceId}`,
    );
    await this.triggerRepository.updateConfig(trigger.id, {
      webhookId: channelId,
      resourceId,
    });

    this.logger.log(`created google sheets webhook, triggerId = ${trigger.id}`);
  }

  async stop(data: {
    trigger: Trigger;
    dataSource: DataSource;
  }): Promise<void> {
    const { trigger, dataSource } = data;
    this.logger.log(`stop google sheets webhook, triggerId = ${trigger.id}`);
    const dataSourceConfig = dataSource.config as GoogleSheetsDataSourceConfig;
    const refreshToken = dataSourceConfig.auth.refreshToken;

    const client = await this.googleService.createAuthClient(refreshToken);
    await this.googleSheetsService.stopFileChangeWebhook({
      client,
      webhookId: trigger.config.webhookId,
      resourceId: trigger.config.resourceId,
    });
  }
}

@Processor(QUEUES.GOOGLE_SHEETS_WEBHOOK_REFRESH)
@Injectable()
export class GoogleSheetsWebhookJobProcessor {
  private readonly logger = new Logger(GoogleSheetsWebhookJobProcessor.name);

  constructor(
    @Inject(InjectTokens.TRIGGER_REPOSITORY)
    private readonly triggerRepository: ITriggerRepository,
    @Inject(InjectTokens.SYNCFLOW_REPOSITORY)
    private readonly syncflowRepository: ISyncflowRepository,
    @Inject(InjectTokens.DATA_SOURCE_REPOSITORY)
    private readonly dataSourceRepository: IDataSourceRepository,
    private readonly googleSheetsWebhookService: GoogleSheetsWebhookService,
  ) {}

  @Process()
  async process(job: Job<GoogleSheetsWebhookRefreshmentJobData>) {
    const triggerId = job.data.triggerId;
    this.logger.log(`refresh google sheets webhook, triggerId = ${triggerId}`);
    const trigger = await this.triggerRepository.getById(triggerId);
    if (trigger) {
      const syncflow = await this.syncflowRepository.getById(
        trigger.workflow.id,
      );
      const dataSource = await this.dataSourceRepository.getById(
        syncflow.sourceId,
      );
      try {
        await this.googleSheetsWebhookService.stop({
          trigger,
          dataSource,
        });
      } catch (e) {
        this.logger.log(
          `failed to stop google sheets webhook, triggerId = ${triggerId}, error = ${e.message}`,
        );
      }
      await this.googleSheetsWebhookService.create({
        trigger,
        dataSource,
      });
    } else {
      this.logger.log(`trigger ${triggerId} not found`);
    }
  }

  @OnQueueCompleted()
  async onCompleted(job: Job<GoogleSheetsWebhookRefreshmentJobData>) {
    this.logger.log(
      `refresh google sheets webhook succeed, triggerId = ${job.data.triggerId}`,
    );
  }

  @OnQueueFailed()
  async onFailed(job: Job<GoogleSheetsWebhookRefreshmentJobData>) {
    this.logger.warn(
      `refresh google sheets webhook failed, triggerId = ${job.data.triggerId}`,
    );
  }
}
