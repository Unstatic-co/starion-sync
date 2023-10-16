import { Injectable, Logger } from '@nestjs/common';
import { DataSourceService } from '../datasource/dataSource.service';
import {
  DataSourceCreatedDto,
  ExcelDataSourceConfig,
  GoogleSheetsDataSourceConfig,
} from './dto/data-source-created.dto';
import { ProviderType } from 'src/lib/provider';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ConfigName } from 'src/config';
import { ApiError } from 'src/common/exception';
import { ErrorCode } from 'src/common/constants';
import { SyncflowSucceedDto } from './dto/syncflow-succeed.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { DataSource } from 'src/entities';
import { DataSourceDeletedDto } from './dto/data-source-deleted.dto';
import { DataSourceSchema, SchemaField } from 'src/lib/schema';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(DataSource)
    private dataSourceRepository: Repository<DataSource>,
    private readonly configService: ConfigService,
    private readonly dataSourceService: DataSourceService,
  ) {}

  verifySignature(webhookData: any, signature: string) {
    const publicKey = this.configService.get<string>(
      `${ConfigName.STARION_SYNC}.webhookPublicKey`,
    );
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(JSON.stringify(webhookData));
    const isVerified = verifier.verify(publicKey, signature, 'base64');
    if (!isVerified) {
      throw new ApiError(ErrorCode.FORBIDDEN, 'signature verification failed');
    }
  }

  async handleDataSourceCreated(data: DataSourceCreatedDto) {
    this.logger.log(`handle data source created ${data.dataSourceId}`);
    switch (data.dataProvider) {
      case ProviderType.MicrosoftExcel:
        await (async () => {
          const dataSourceConfig =
            data.dataSourceConfig as ExcelDataSourceConfig;
          await this.dataSourceService.createExcelDataSource({
            dataSourceId: data.dataSourceId,
            refreshToken: dataSourceConfig.auth.refreshToken,
            workbookId: dataSourceConfig.workbookId,
            worksheetId: dataSourceConfig.worksheetId,
            timezone: dataSourceConfig.timezone,
          });
        })();
        break;
      case ProviderType.GoogleSheets:
        await (async () => {
          const dataSourceConfig =
            data.dataSourceConfig as GoogleSheetsDataSourceConfig;
          await this.dataSourceService.createGoogleSheetsDataSource({
            dataSourceId: data.dataSourceId,
            refreshToken: dataSourceConfig.auth.refreshToken,
            spreadsheetId: dataSourceConfig.spreadsheetId,
            sheetId: dataSourceConfig.sheetId,
          });
        })();
        break;
      default:
        throw new Error('unsupported data source type');
    }
  }

  async handleSyncflowSucceed(data: SyncflowSucceedDto) {
    this.logger.log(`handle syncflow succeed, ds = ${data.dataSourceId}`);
    if (data.syncVersion <= 1 || data.statistics.isSchemaChanged) {
      // update schema
      const starionUrl = this.configService.get<string>(
        `${ConfigName.STARION_SYNC}.baseUrl`,
      );
      const schemaFields = (await axios
        .get(`${starionUrl}/datasources/${data.dataSourceId}/schema`, {
          headers: {
            'X-API-Key': this.configService.get<string>(
              `${ConfigName.STARION_SYNC}.apiKey`,
            ),
          },
        })
        .then((res) => res.data)) as SchemaField[];

      const schema: DataSourceSchema = {};
      schemaFields.forEach((field) => {
        schema[field.id] = field;
      });

      if (schemaFields?.length) {
        this.logger.log(`update schema for ds ${data.dataSourceId}`);
        await this.dataSourceRepository.update(
          {
            id: data.dataSourceId,
          },
          {
            schema: () => `jsonb '${JSON.stringify(schema)}'`,
          },
        );
      } else {
        this.logger.warn(`schema is empty for ds ${data.dataSourceId}`);
      }
    }
  }

  async handleDataSourceDeleted(data: DataSourceDeletedDto) {
    return this.dataSourceService.deleteDataSource(data.dataSourceId);
  }
}
