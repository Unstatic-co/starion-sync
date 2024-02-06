import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataProviderCleaner, WorkflowCleaner } from '../cleaner.factory';
import { ProviderId, Syncflow } from '@lib/core';
import { InjectTokens as AppInjectTokens } from '../../../common/inject-tokens';
import { DeleteObjectsCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { ConfigName } from '@lib/core/config';

@Injectable()
export class GoogleSheetsWorkflowCleaner implements WorkflowCleaner {
  private readonly logger = new Logger(GoogleSheetsWorkflowCleaner.name);

  constructor(
    @Inject(AppInjectTokens.STORAGE_CLIENT)
    private readonly storageClient: S3Client,
    private readonly configService: ConfigService,
  ) { }

  async run(
    syncflow: Syncflow,
    additionalData: {
      syncVersion: number;
      prevSyncVersion: number;
    },
  ): Promise<void> {
    this.logger.log(`Cleaning workflow ${syncflow.id}`);
    const { prevSyncVersion } = additionalData;
    await this.cleanDiffData(syncflow.sourceId, prevSyncVersion);
  }

  private async cleanDiffData(dataSourceId: string, syncVersion: number) {
    this.logger.log(
      `Cleaning diff data for ds ${dataSourceId}, version ${syncVersion}`,
    );

    const res = await this.storageClient.send(
      new DeleteObjectsCommand({
        Bucket: this.configService.get<string>(
          `${ConfigName.STORAGE}.s3DiffDataBucket`,
        ),
        Delete: {
          Objects: [
            {
              Key: `data/${dataSourceId}-${syncVersion}.json`,
            },
            {
              Key: `data/${dataSourceId}-${syncVersion}.parquet`,
            },
            {
              Key: `schema/${dataSourceId}-${syncVersion}.json`,
            },
            {
              Key: `result/${dataSourceId}-${syncVersion}-addedRows.json`,
            },
            {
              Key: `result/${dataSourceId}-${syncVersion}-deletedRows.json`,
            },
            {
              Key: `result/${dataSourceId}-${syncVersion}-deletedFields.json`,
            },
            {
              Key: `result/${dataSourceId}-${syncVersion}-updatedFields.json`,
            },
            {
              Key: `result/${dataSourceId}-${syncVersion}-addedFields.json`,
            },
            {
              Key: `result/${dataSourceId}-${syncVersion}-schema.json`,
            },
          ],
        },
      }),
    );

    if (res.Errors?.length) {
      this.logger.log(
        `Failed to clean objects: ${res.Errors.map((o) => o.Key).join(',')}`,
      );
    }

    this.logger.log(`Cleaned ${res.Deleted?.length} objects`);
  }
}

@Injectable()
export class GoogleSheetsDataProviderCleaner implements DataProviderCleaner {
  private readonly logger = new Logger(GoogleSheetsDataProviderCleaner.name);

  constructor(
    @Inject(AppInjectTokens.STORAGE_CLIENT)
    private readonly storageClient: S3Client,
    private readonly configService: ConfigService,
  ) { }

  async run(
    providerId: ProviderId
  ): Promise<void> {
    this.logger.log(`Cleaning provider ${providerId}`);
    await this.cleanSpreadsheetData(providerId);
  }

  private async cleanSpreadsheetData(providerId: ProviderId) {
    this.logger.log(
      `Cleaning diff data for ds ${providerId}`,
    );

    const res = await this.storageClient.send(
      new DeleteObjectsCommand({
        Bucket: this.configService.get<string>(
          `${ConfigName.STORAGE}.s3DiffDataBucket`,
        ),
        Delete: {
          Objects: [
            {
              Key: `data/${providerId}.xlsx`,
            },
          ],
        },
      }),
    );

    if (res.Errors?.length) {
      this.logger.log(
        `Failed to clean objects: ${res.Errors.map((o) => o.Key).join(',')}`,
      );
    }

    this.logger.log(`Cleaned ${res.Deleted?.length} objects`);
  }
}
