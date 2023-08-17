import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataProviderService } from '../data-provider/data-provider.service';
import {
  DataSource,
  DataSourceId,
  ExcelDataSourceConfig,
  ProviderConfig,
  ProviderId,
  ProviderType,
} from '@lib/core';
import {
  CreateDataSourceDto,
  DataSourceConfigDto,
} from './dto/createDataSource.dto';
import {
  IDataProviderRepository,
  IDataSourceRepository,
  InjectTokens,
  UpdateDataSourceData,
} from '@lib/modules';
import { ApiError } from '../../common/exception/api.exception';
import { ErrorCode } from '../../common/constants';
import { ProviderConfigDto } from '../data-provider/dto/createProvider.dto';
import { CreationResult } from '../../common/type';
import { DeleteResult } from '../../common/type/deleteResult';

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
  ) {}
  /**
   * Hello world
   * @return {string} Hello message
   */
  getHello(): string {
    return 'Hello World !';
  }

  async test() {
    throw new Error('demo loi');
  }

  public async getById(id: DataSourceId) {
    this.logger.log(`Get data source by id: ${id}`);
    const dataSource = await this.dataSourceRepository.getById(id);
    if (!dataSource) {
      throw new ApiError(
        ErrorCode.NO_DATA_EXISTS,
        `DataSource with id ${id} not found`,
      );
    }
    return dataSource;
  }

  async create(dto: CreateDataSourceDto): Promise<CreationResult<DataSource>> {
    const isAlreadyCreated = false;
    const { type, config, metadata } = dto;
    const { externalId, externalLocalId } =
      this.getOrGenerateDataSourceExternalId(type, config);
    // const existingDataSource = await this.dataSourceRepository.getByExternalId(
    // externalId,
    // );
    // if (existingDataSource) {
    // isAlreadyCreated = true;
    // return {
    // data: existingDataSource,
    // isAlreadyCreated,
    // };
    // }
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
    await this.checkDataSourceInProvider(
      dataProvider.type,
      dataProvider.config,
      externalLocalId,
    );
    const dataSource = await this.dataSourceRepository.create({
      externalId,
      externalLocalId,
      config: { ...dataProvider.config, ...config },
      providerId: dataProvider.id,
      providerType: type,
      metadata,
    });
    return {
      data: dataSource,
      isAlreadyCreated,
    };
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

  async delete(id: DataSourceId): Promise<DeleteResult<DataSource>> {
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
    })) as DataSource;
    return {
      isAlreadyDeleted,
      data,
    };
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
      throw new ApiError(
        ErrorCode.INVALID_DATA,
        `Data source with id ${externalLocalId} not found in provider`,
      );
    }

    return dataSourceInProvider;
  }
}
