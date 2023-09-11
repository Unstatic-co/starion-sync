import { ConfigName } from '@lib/core/config';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { UnacceptableActivityError } from '../../common/exception';
import {
  GoogleSheetsDataSourceAuthConfig,
  GoogleSheetsDataSourceConfig,
  Syncflow,
} from '@lib/core';
import { IDataSourceRepository, InjectTokens } from '@lib/modules';
import { GoogleService } from '@lib/modules/third-party';

@Injectable()
export class GoogleSheetsActivities {
  private readonly logger = new Logger(GoogleSheetsActivities.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(InjectTokens.DATA_SOURCE_REPOSITORY)
    private readonly dataSourceRepository: IDataSourceRepository,
    private readonly googleService: GoogleService,
  ) {}

  async getSyncDataGoogleSheets(syncflow: Syncflow) {
    this.logger.debug(`Getting sync data for syncflow: ${syncflow.id}`);
    const dataSource = await this.dataSourceRepository.getById(
      syncflow.sourceId,
    );
    if (!dataSource) {
      throw new UnacceptableActivityError(
        `DataSource not found: ${syncflow.sourceId}`,
        { shouldWorkflowFail: false },
      );
    }
    const accessToken = await this.googleService.getAccessToken(
      (dataSource.config.auth as GoogleSheetsDataSourceAuthConfig).refreshToken,
    );
    const config = dataSource.config as GoogleSheetsDataSourceConfig;
    return {
      dataSourceId: syncflow.sourceId,
      syncVersion: syncflow.state.version,
      prevVersion: syncflow.state.prevVersion,
      spreadsheetId: config.spreadsheetId,
      sheetId: config.sheetId,
      accessToken,
      destTableName: config.dest?.tableName || `_${dataSource.id}`,
    };
  }

  async downloadGoogleSheets(data: {
    dataSourceId: string;
    syncVersion: number;
    spreadsheetId: string;
    sheetId: string;
    accessToken: string;
  }) {
    this.logger.debug(`Downloading for ds: ${data.dataSourceId}`);
    try {
      const downloaderUrl = this.configService.get(
        `${ConfigName.PROCESSOR}.downloaderUrl`,
      );
      await axios.post(`${downloaderUrl}/api/v1/google-sheets/download`, data, {
        headers: {
          'X-API-Key': this.configService.get(`${ConfigName.PROCESSOR}.apiKey`),
        },
      });
    } catch (err) {
      throw new UnacceptableActivityError(
        `Error when executing downloader: ${err.message}`,
        {
          shouldActivityRetry: true,
        },
      );
    }
  }

  async compareGoogleSheets(data: {
    dataSourceId: string;
    syncVersion: number;
    prevVersion: number;
  }) {
    this.logger.debug(`Comparing for ds: ${data.dataSourceId}`);
    try {
      const comparerUrl = this.configService.get(
        `${ConfigName.PROCESSOR}.comparerUrl`,
      );
      await axios.post(`${comparerUrl}/api/v1/google-sheets/compare`, data, {
        headers: {
          'X-API-Key': this.configService.get(`${ConfigName.PROCESSOR}.apiKey`),
        },
      });
    } catch (err) {
      throw new UnacceptableActivityError(
        `Error when executing comparer: ${err.message}`,
        {
          shouldActivityRetry: true,
        },
      );
    }
  }

  async loadGoogleSheets(data: {
    dataSourceId: string;
    syncVersion: number;
    prevVersion: number;
    tableName?: string;
  }) {
    this.logger.debug(`Loading for ds: ${data.dataSourceId}`);
    try {
      const loaderUrl = this.configService.get(
        `${ConfigName.PROCESSOR}.loaderUrl`,
      );
      const res = await axios.post(
        `${loaderUrl}/api/v1/google-sheets/load`,
        data,
        {
          headers: {
            'X-API-Key': this.configService.get(
              `${ConfigName.PROCESSOR}.apiKey`,
            ),
          },
        },
      );
      return res.data.data as {
        addedRowsCount: number;
        deletedRowsCount: number;
        isSchemaChanged: boolean;
      };
    } catch (err) {
      throw new UnacceptableActivityError(
        `Error when executing loader: ${err.message}`,
        {
          shouldActivityRetry: true,
        },
      );
    }
  }
}
