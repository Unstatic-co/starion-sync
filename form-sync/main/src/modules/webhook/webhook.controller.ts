import { Body, Controller, Headers, Post } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { DataSourceService } from '../datasource/dataSource.service';
import { DataSourceCreatedDto } from './dto/data-source-created.dto';
import { SyncflowSucceedDto } from './dto/syncflow-succeed.dto';
import { DataSourceDeletedDto } from './dto/data-source-deleted.dto';

@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly dataSourceService: DataSourceService,
  ) {}

  @Post('data-source-created')
  async dataSourceCreated(
    @Body() data: DataSourceCreatedDto,
    @Headers('X-Signature') signature: string,
  ) {
    this.webhookService.verifySignature(data, signature);
    return this.webhookService.handleDataSourceCreated(data);
  }

  @Post('syncflow-succeed')
  async syncflowSucceed(
    @Body() data: SyncflowSucceedDto,
    @Headers('X-Signature') signature: string,
  ) {
    this.webhookService.verifySignature(data, signature);
    return this.webhookService.handleSyncflowSucceed(data);
  }

  @Post('data-source-deleted')
  async dataSourceDeleted(
    @Body() data: DataSourceDeletedDto,
    @Headers('X-Signature') signature: string,
  ) {
    this.webhookService.verifySignature(data, signature);
    return this.webhookService.handleDataSourceDeleted(data);
  }
}
