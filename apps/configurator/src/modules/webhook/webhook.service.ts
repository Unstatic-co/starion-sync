import {
  IDataSourceRepository,
  IWebhookRepository,
  InjectTokens,
} from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateWebhookDto, CreateWebhooksDto } from './dto/createWebhook.dto';
import { ApiError } from '../../common/exception';
import { WebhookScope } from '@lib/core';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(InjectTokens.DATA_SOURCE_REPOSITORY)
    private readonly dataSourceRepository: IDataSourceRepository,
    @Inject(InjectTokens.WEBHOOK_REPOSITORY)
    private readonly webhookRepository: IWebhookRepository,
  ) {}

  async create(data: CreateWebhookDto) {
    let scope = WebhookScope.GLOBAL;
    if (data.dataSourceId) {
      const dataSource = await this.dataSourceRepository.getById(
        data.dataSourceId,
      );
      if (!dataSource) {
        throw new ApiError(
          404,
          `DataSource with id ${data.dataSourceId} not found`,
        );
      }
      scope = WebhookScope.DATA_SOURCE;
    }
    await this.webhookRepository.create({ ...data, scope });
  }

  async bulkCreate(data: CreateWebhooksDto) {
    const bulkData = [];
    await Promise.all(
      data.webhooks.map(async (webhook) => {
        if (webhook.dataSourceId) {
          const dataSource = await this.dataSourceRepository.getById(
            webhook.dataSourceId,
          );
          if (!dataSource) {
            throw new ApiError(
              404,
              `DataSource with id ${webhook.dataSourceId} not found`,
            );
          }
          bulkData.push({ ...webhook, scope: WebhookScope.DATA_SOURCE });
        } else {
          bulkData.push({ ...webhook, scope: WebhookScope.GLOBAL });
        }
      }),
    );
    await this.webhookRepository.bulkCreate(bulkData);
  }
}
