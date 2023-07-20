import { ConfigName } from '@lib/core/config';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { UnacceptableActivityError } from '../../common/exception';
import {
  ExcelDataSourceAuthConfig,
  ExcelDataSourceConfig,
  Syncflow,
} from '@lib/core';
import { IDataSourceRepository, InjectTokens } from '@lib/modules';
import { MicrosoftService } from '@lib/modules/third-party';

@Injectable()
export class MicrosoftExcelActivities {
  constructor(
    private readonly configService: ConfigService,
    @Inject(InjectTokens.DATA_SOURCE_REPOSITORY)
    private readonly dataSourceRepository: IDataSourceRepository,
    private readonly microsoftService: MicrosoftService,
  ) {}

  async getSyncDataExcel(syncflow: Syncflow) {
    const dataSource = await this.dataSourceRepository.getById(
      syncflow.sourceId,
    );
    if (!dataSource) {
      throw new UnacceptableActivityError(
        `DataSource not found: ${syncflow.sourceId}`,
        { shouldWorkflowFail: false },
      );
    }
    const accessToken = await this.microsoftService.getAccessToken(
      (dataSource.config.auth as ExcelDataSourceAuthConfig).refreshToken,
    );
    return {
      dataSourceId: syncflow.sourceId,
      syncVersion: syncflow.state.version,
      workbookId: (dataSource.config as ExcelDataSourceConfig).workbookId,
      worksheetId: (dataSource.config as ExcelDataSourceConfig).worksheetId,
      accessToken,
    };
  }

  async downloadExcel(data: {
    dataSourceId: string;
    syncVersion: number;
    workbookId: string;
    worksheetId: string;
    accessToken: string;
  }) {
    try {
      const downloaderUrl = this.configService.get(
        `${ConfigName.PROCESSOR}.downloaderUrl`,
      );
      await axios.post(`${downloaderUrl}/api/v1/excel/download`, data);
    } catch (err) {
      throw new UnacceptableActivityError(
        `Error when executing downloader: ${err.message}`,
        {
          shouldActivityRetry: true,
        },
      );
    }
  }

  async compareExcel(data: { dataSourceId: string; syncVersion: number }) {
    try {
      const comparerUrl = this.configService.get(
        `${ConfigName.PROCESSOR}.comparerUrl`,
      );
      await axios.post(`${comparerUrl}/api/v1/excel/compare`, data);
    } catch (err) {
      throw new UnacceptableActivityError(
        `Error when executing comparer: ${err.message}`,
        {
          shouldActivityRetry: true,
        },
      );
    }
  }

  async loadExcel(data: { dataSourceId: string; syncVersion: number }) {
    try {
      const loaderUrl = this.configService.get(
        `${ConfigName.PROCESSOR}.loaderUrl`,
      );
      await axios.post(`${loaderUrl}/api/v1/excel/load`, data);
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
