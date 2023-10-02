import { ConfigName } from '@lib/core/config';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { UnacceptableActivityError } from '../../common/exception';
import { ExcelDataSourceConfig, Syncflow } from '@lib/core';
import { IDataSourceRepository, InjectTokens } from '@lib/modules';
import { MicrosoftService } from '@lib/modules/third-party';
import {
  activityWrapper,
  processorApiWrapper,
  processorWrapper,
} from '../wrapper';

@Injectable()
export class MicrosoftExcelActivities {
  private readonly logger = new Logger(MicrosoftExcelActivities.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(InjectTokens.DATA_SOURCE_REPOSITORY)
    private readonly dataSourceRepository: IDataSourceRepository,
    private readonly microsoftService: MicrosoftService,
  ) {}

  async getSyncDataExcel(syncflow: Syncflow) {
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
    const config = dataSource.config as ExcelDataSourceConfig;
    return {
      dataSourceId: syncflow.sourceId,
      syncVersion: syncflow.state.version,
      prevVersion: syncflow.state.prevVersion,
      workbookId: config.workbookId,
      worksheetId: config.worksheetId,
      timezone: config.timezone,
      refreshToken: config.auth.refreshToken,
      destTableName: config.dest?.tableName || `_${dataSource.id}`,
    };
  }

  async downloadExcel(data: {
    dataSourceId: string;
    syncVersion: number;
    workbookId: string;
    worksheetId: string;
    timezone: string;
    refreshToken: string;
  }) {
    await activityWrapper(async () => {
      this.logger.debug(`Downloading for ds: ${data.dataSourceId}`);
      return processorWrapper('downloader', async () => {
        const accessToken = await this.microsoftService.getAccessToken(
          data.refreshToken,
        );
        delete data['refreshToken'];
        const downloaderUrl = this.configService.get(
          `${ConfigName.PROCESSOR}.downloaderUrl`,
        );
        return processorApiWrapper(async () =>
          axios.post(
            `${downloaderUrl}/api/v1/excel/download`,
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

  async compareExcel(data: {
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
          axios.post(`${comparerUrl}/api/v1/excel/compare`, data, {
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

  async loadExcel(data: {
    dataSourceId: string;
    syncVersion: number;
    prevVersion: number;
    tableName?: string;
  }) {
    return await activityWrapper(async () => {
      this.logger.debug(`Loading for ds: ${data.dataSourceId}`);
      return processorWrapper('loader', async () => {
        const loaderUrl = this.configService.get(
          `${ConfigName.PROCESSOR}.loaderUrl`,
        );
        return processorApiWrapper(async () => {
          const res = await axios.post(`${loaderUrl}/api/v1/excel/load`, data, {
            headers: {
              'X-API-Key': this.configService.get(
                `${ConfigName.PROCESSOR}.apiKey`,
              ),
            },
          });
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
