import { Inject, Injectable, Logger, Delete } from '@nestjs/common';
import { DataProviderService } from '../data-provider/data-provider.service';
import {
  DataSource,
  DataSourceId,
  ERROR_CODE,
  ExcelDataSourceConfig,
  ExternalError,
  GoogleSheetsDataSourceConfig,
  ProviderConfig,
  ProviderId,
  ProviderType,
  SyncConnection,
} from '@lib/core';
import {
  CreateDataSourceDto,
  DataSourceConfigDto,
} from './dto/createDataSource.dto';
import {
  IDataProviderRepository,
  IDataSourceRepository,
  IDestinationDatabaseService,
  InjectTokens,
  UpdateDataSourceData,
} from '@lib/modules';
import { ApiError } from '../../common/exception/api.exception';
import { ErrorCode } from '../../common/constants';
import { ProviderConfigDto } from '../data-provider/dto/createProvider.dto';
import { CreationResult } from '../../common/type';
import { DeleteResult } from '../../common/type/deleteResult';
import { DataDiscovererService } from '../discoverer/discoverer.service';
import { WorkflowService } from '../workflow/workflow.service';
import { UpdateSyncConnectionDto } from './dto/updateSyncConnection.dto';
import { SyncConnectionService } from '../sync-connection/syncConection.service';

export type DeleteDataSourceResult = {
  dataSource: DataSource;
  syncConnection?: SyncConnection;
};

@Injectable()
/**
 * App Service
 */
export class DataSourceService {
  private readonly logger = new Logger(DataSourceService.name);

  constructor(
    private readonly dataProviderService: DataProviderService,
    @Inject(InjectTokens.DATA_PROVIDER_REPOSITORY)
    private readonly dataProviderRepository: IDataProviderRepository,
    @Inject(InjectTokens.DATA_SOURCE_REPOSITORY)
    private readonly dataSourceRepository: IDataSourceRepository,
    @Inject(InjectTokens.DESTINATION_DATABASE_SERVICE)
    private readonly destinationDatabaseService: IDestinationDatabaseService,
    private readonly discovererService: DataDiscovererService,
    private readonly workflowService: WorkflowService,
    private readonly syncConnectionService: SyncConnectionService,
  ) {}
  /**
   * Hello world
   * @return {string} Hello message
   */
  getHello(): string {
    return 'Hello World !';
  }

  async test() {}

  public async getById(id: DataSourceId) {
    this.logger.log(`Get data source by id: ${id}`);
    const dataSource = await this.dataSourceRepository.getById(id);
    if (!dataSource) {
      throw new ApiError(ErrorCode.NO_DATA_EXISTS, `Data source not found`);
    }
    return dataSource;
  }

  public async getSchema(id: DataSourceId) {
    const schema = await this.destinationDatabaseService.getSchema(id);
    return schema;
  }

  public async getData(id: DataSourceId) {
    const dataSource = await this.getById(id);
    const dataTableName =
      dataSource.config.dest?.tableName || `_${dataSource.id}`;
    const res = await this.destinationDatabaseService.getData(dataTableName);
    return res;
  }

  async create(dto: CreateDataSourceDto): Promise<CreationResult<DataSource>> {
    try {
      const isAlreadyCreated = false;
      const { type, config, metadata } = dto;
      const { externalId, externalLocalId } =
        this.getOrGenerateDataSourceExternalId(type, config);
      const dataProviderExternalId =
        this.dataProviderService.getOrGenerateProviderExternalId(
          type,
          config as ProviderConfigDto,
        );
      let dataProvider = await this.dataProviderRepository.getByExternalId(
        dataProviderExternalId,
      );
      if (!dataProvider) {
        dataProvider = (
          await this.dataProviderService.create({
            type,
            config,
            metadata,
          })
        ).data;
      }

      await this.discovererService.checkDataSource(dataProvider.type, config);

      const dataSource = await this.dataSourceRepository.create({
        externalId,
        externalLocalId,
        config,
        providerId: dataProvider.id,
        providerType: type,
        metadata,
      });
      return {
        data: dataSource,
        isAlreadyCreated,
      };
    } catch (error) {
      throw error;
    }
  }

  public async update(id: ProviderId, data: UpdateDataSourceData) {
    this.logger.log(`Update data source: ${id}`);
    const { metadata } = data;
    let result;
    try {
      result = await this.dataSourceRepository.update(
        {
          id,
          metadata,
        },
        { new: true },
      );
    } catch (error) {
      throw new ApiError(
        ErrorCode.INVALID_DATA,
        `Failed to update source: ${error.message}`,
      );
    }

    return result;
  }

  public async updateSyncConnection(
    id: DataSourceId,
    data: UpdateSyncConnectionDto,
  ) {
    const dataSource = await this.getById(id);
    await this.syncConnectionService.updateStateWithDataSourceId(
      dataSource.id,
      data,
    );
  }

  async delete(
    id: DataSourceId,
  ): Promise<DeleteResult<DeleteDataSourceResult>> {
    this.logger.debug(`Delete ds with id: ${id}`);
    let isAlreadyDeleted = false;
    const existingDs = await this.dataSourceRepository.getById(id);
    if (!existingDs) {
      isAlreadyDeleted = true;
      return {
        isAlreadyDeleted,
      };
    }
    const data = (await this.dataSourceRepository.delete(id, {
      old: true,
    })) as DeleteDataSourceResult;

    return {
      isAlreadyDeleted,
      data,
    };
  }

  async terminateDataSourceWorkflows(id: DataSourceId) {
    const query = `DataSourceId = '${id}' AND (ExecutionStatus = 'Running' OR ExecutionStatus = 'TimedOut' OR ExecutionStatus = 'ContinuedAsNew')`;
    return this.workflowService.terminateWorkflowsByQuery(
      query,
      'Data source deleted',
    );
  }

  public getOrGenerateDataSourceExternalId(
    type: ProviderType,
    config: DataSourceConfigDto,
  ) {
    let externalId: string;
    let externalLocalId: string;
    switch (type) {
      case ProviderType.MICROSOFT_EXCEL:
        const { workbookId, worksheetId, driveId } =
          config as unknown as ExcelDataSourceConfig;
        if (!driveId) {
          externalId = `${workbookId}`;
          externalLocalId = `${worksheetId}`;
        } else {
          externalId = `${driveId}-${workbookId}`;
          externalLocalId = `${worksheetId}`;
        }
        break;
      case ProviderType.GOOGLE_SHEETS:
        const { spreadsheetId, sheetId } =
          config as unknown as GoogleSheetsDataSourceConfig;
        externalId = `${spreadsheetId}`;
        externalLocalId = `${sheetId}`;
        break;
      default:
        throw new Error(`Unknown provider type ${type}`);
    }
    return {
      externalId,
      externalLocalId,
    };
  }

  public async checkDataSourceInProvider(
    providerType: ProviderType,
    providerConfig: ProviderConfig,
    externalLocalId: string,
  ) {
    const discoveredDataSources =
      await this.dataProviderService.discoverByConfig(
        providerType,
        providerConfig,
      );
    const dataSourceInProvider = discoveredDataSources.find(
      (discoveredDataSource) => discoveredDataSource.id === externalLocalId,
    );

    if (!dataSourceInProvider) {
      throw new ExternalError(
        ERROR_CODE.DATA_SOURCE_NOT_FOUND,
        "Data source doesn't exist in provider",
      );
    }

    return dataSourceInProvider;
  }
}
