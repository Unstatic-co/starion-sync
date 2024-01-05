import { ConfigName } from '@lib/core/config';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { UnacceptableActivityError } from '../../common/exception';
import {
  DataSourceId,
  GoogleSheetsDataSourceConfig,
  GoogleSheetsFullSyncState,
  GoogleSheetsProviderState,
  ProviderId,
  Syncflow,
} from '@lib/core';
import {
  IDataProviderRepository,
  IDataSourceRepository,
  InjectTokens,
} from '@lib/modules';
import { GoogleService, GoogleSheetsService } from '@lib/modules/third-party';
import {
  activityWrapper,
  processorApiWrapper,
  processorWrapper,
} from '../wrapper';

@Injectable()
export class GoogleSheetsActivities {
  private readonly logger = new Logger(GoogleSheetsActivities.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(InjectTokens.DATA_SOURCE_REPOSITORY)
    private readonly dataSourceRepository: IDataSourceRepository,
    @Inject(InjectTokens.DATA_PROVIDER_REPOSITORY)
    private readonly dataProviderRepository: IDataProviderRepository,
    private readonly googleService: GoogleService,
    private readonly googleSheetsService: GoogleSheetsService,
  ) { }

  async getDataStateGoogleSheets(syncflow: Syncflow) {
    const dataSource = await this.dataSourceRepository.getById(
      syncflow.sourceId,
    );
    if (!dataSource) {
      throw new UnacceptableActivityError(
        `DataSource not found: ${syncflow.sourceId}`,
        { shouldWorkflowFail: false },
      );
    }
    const dataProvider = await this.dataProviderRepository.getById(
      dataSource.provider.id,
    );
    if (!dataProvider) {
      throw new UnacceptableActivityError(
        `DataProvider not found: ${dataSource.provider.id}`,
        { shouldWorkflowFail: false },
      );
    }
    const syncflowState = syncflow.state as GoogleSheetsFullSyncState;

    const result = {
      providerDownloadedAt: dataProvider.state.downloadedAt,
      downloadedAt: syncflowState.downloadedAt,
    };
    return result;
  }

  async getDownloadDataGoogleSheets(syncflow: Syncflow) {
    this.logger.debug(`Getting download data for syncflow: ${syncflow.id}`);
    const dataSource = await this.dataSourceRepository.getById(
      syncflow.sourceId,
    );
    if (!dataSource) {
      throw new UnacceptableActivityError(
        `DataSource not found: ${syncflow.sourceId}`,
        { shouldWorkflowFail: false },
      );
    }
    const provider = await this.dataProviderRepository.getById(
      dataSource.provider.id,
    );
    if (!provider) {
      throw new UnacceptableActivityError(
        `DataProvider not found: ${dataSource.provider.id}`,
        { shouldWorkflowFail: false },
      );
    }
    const config = dataSource.config as GoogleSheetsDataSourceConfig;
    const syncflowState = syncflow.state as GoogleSheetsFullSyncState;

    const result = {
      dataSourceId: syncflow.sourceId,
      dataProviderId: dataSource.provider.id,
      providerDownloadedAt: provider.state?.downloadedAt,
      downloadedAt: syncflowState.downloadedAt,
      spreadsheetId: config.spreadsheetId,
      sheetId: config.sheetId,
      refreshToken: config.auth.refreshToken,
    };
    return result;
  }

  async getDataSourceProviderGoogleSheets(dataSourceId: DataSourceId) {
    this.logger.debug(`Getting data provider for datasource: ${dataSourceId}`);
    const dataSource = await this.dataSourceRepository.getById(dataSourceId, {
      select: ['provider'],
    });
    return dataSource.provider;
  }

  async getSpreadSheetDataGoogleSheets(data: {
    spreadsheetId: string;
    refreshToken: string;
  }) {
    const client = await this.googleService.createAuthClient(data.refreshToken);
    const res = await this.googleSheetsService.getSpreadSheets({
      client,
      spreadsheetId: data.spreadsheetId,
      fields: [
        'sheets.properties.sheetId',
        'sheets.properties.index',
        'sheets.properties.title',
        'properties.timeZone',
      ],
    });
    const timeZone = res.properties.timeZone;
    const sheets: {
      [sheetId: string]: {
        name: string;
        index: number;
      };
    } = {};
    if (res.sheets) {
      res.sheets.forEach((sheet) => {
        sheets[sheet.properties.sheetId.toString()] = {
          name: sheet.properties.title,
          index: sheet.properties.index,
        };
      });
    }
    return {
      timeZone,
      sheets,
    };
  }

  async updateProviderStateGoogleSheets(
    id: ProviderId,
    data: GoogleSheetsProviderState,
  ) {
    const dataProvider = await this.dataProviderRepository.getById(id);
    if (!dataProvider) {
      throw new UnacceptableActivityError(`DataProvider not found: ${id}`, {
        shouldWorkflowFail: false,
      });
    }
    await this.dataProviderRepository.updateState(id, data);
  }

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
    const dataProvider = await this.dataProviderRepository.getById(
      dataSource.provider.id,
    );
    if (!dataProvider) {
      throw new UnacceptableActivityError(
        `DataProvider not found: ${dataSource.provider.id}`,
        { shouldWorkflowFail: false },
      );
    }
    const config = dataSource.config as GoogleSheetsDataSourceConfig;
    const syncflowState = syncflow.state as GoogleSheetsFullSyncState;

    const result = {
      dataProviderState: dataProvider.state as GoogleSheetsProviderState,
      dataProviderId: dataSource.provider.id,
      dataSourceId: syncflow.sourceId,
      syncVersion: syncflowState.version,
      prevVersion: syncflowState.prevVersion,
      downloadedAt: syncflowState.downloadedAt,
      spreadsheetId: config.spreadsheetId,
      sheetId: config.sheetId,
      refreshToken: config.auth.refreshToken,
      destTableName: config.dest?.tableName || `_${dataSource.id}`,
      metadata: null,
    };
    if (syncflow.state.prevVersion === 0) {
      result.metadata = dataSource.metadata;
    }
    return result;
  }

  async downloadGoogleSheets(data: {
    spreadsheetId: string;
    dataProviderId: string;
    refreshToken: string;
  }) {
    await activityWrapper(async () => {
      this.logger.debug(`Downloading for spreadsheet: ${data.spreadsheetId}`);
      return processorWrapper('downloader', async () => {
        const accessToken = await this.googleService.getAccessToken(
          data.refreshToken,
        );
        delete data['refreshToken'];
        const downloaderUrl = this.configService.get(
          `${ConfigName.PROCESSOR}.downloaderUrl`,
        );
        return processorApiWrapper(async () =>
          axios.post(
            `${downloaderUrl}/api/v1/google-sheets/download`,
            {
              ...data,
              accessToken,
            },
            {
              headers: {
                'X-API-Key': this.configService.get(
                  `${ConfigName.PROCESSOR}.apiKey`,
                ),
              },
            },
          ),
        );
      });
    });
  }

  async ingestGoogleSheets(data: {
    dataSourceId: string;
    dataProviderId: string;
    syncVersion: number;
    spreadsheetId: string;
    sheetId: string;
    // sheetName: string;
    // sheetIndex: number;
    // timeZone: string;
    refreshToken: string;
  }) {
    await activityWrapper(async () => {
      this.logger.debug(`Ingesting for ds: ${data.dataSourceId}`);
      return processorWrapper('downloader', async () => {
        const accessToken = await this.googleService.getAccessToken(
          data.refreshToken,
        );
        delete data['refreshToken'];
        const downloaderUrl = this.configService.get(
          `${ConfigName.PROCESSOR}.downloaderUrl`,
        );
        return processorApiWrapper(async () =>
          axios.post(
            `${downloaderUrl}/api/v1/google-sheets/ingest`,
            {
              ...data,
              accessToken,
            },
            {
              headers: {
                'X-API-Key': this.configService.get(
                  `${ConfigName.PROCESSOR}.apiKey`,
                ),
              },
            },
          ),
        );
      });
    });
  }

  async compareGoogleSheets(data: {
    dataSourceId: string;
    syncVersion: number;
    prevVersion: number;
  }) {
    await activityWrapper(async () => {
      this.logger.debug(`Comparing for ds: ${data.dataSourceId}`);
      return processorWrapper('comparer', async () => {
        const comparerUrl = this.configService.get(
          `${ConfigName.PROCESSOR}.comparerUrl`,
        );
        return processorApiWrapper(async () =>
          axios.post(`${comparerUrl}/api/v1/google-sheets/compare`, data, {
            headers: {
              'X-API-Key': this.configService.get(
                `${ConfigName.PROCESSOR}.apiKey`,
              ),
            },
          }),
        );
      });
    });
  }

  async loadGoogleSheets(data: {
    dataSourceId: string;
    syncVersion: number;
    prevVersion: number;
    tableName?: string;
    metadata?: Record<string, any>;
  }) {
    return await activityWrapper(async () => {
      this.logger.debug(`Loading for ds: ${data.dataSourceId}`);
      return processorWrapper('loader', async () => {
        const loaderUrl = this.configService.get(
          `${ConfigName.PROCESSOR}.loaderUrl`,
        );
        return processorApiWrapper(async () => {
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
        });
      });
    });
  }
}
