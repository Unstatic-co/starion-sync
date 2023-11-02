import { Injectable, Logger } from '@nestjs/common';
import {
  MicrosoftGraphService,
  MicrosoftService,
} from '../../third-party/microsoft';
import { IFormSyncService } from '../formsync.factory';
import { Utils } from 'src/utils';
import { FormSyncType } from 'src/lib/formsync';
import { Client } from '@microsoft/microsoft-graph-client';
import { InjectRepository } from '@nestjs/typeorm';
import { DelayedFormSync, ExcelDataSource, FormSync } from 'src/entities';
import { Repository } from 'typeorm';
import {
  DataSourceSchema,
  EXCEL_HASHED_PRIMARY_ID,
  EXCEL_PRIMARY_ID_NAME,
  FieldId,
  NativeDataType,
  RecordId,
} from 'src/lib/schema';
import { ApiError } from 'src/common/exception';
import { ErrorCode } from 'src/common/constants';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { ConfigName } from 'src/config';
import { MetadataService } from 'src/modules/metadata/metadata.service';
import { FormSyncCommonService } from '../common.service';

export type ExcelFormSyncConfig = {
  refreshToken: string;
  workbookId: string;
  worksheetId: string;
};

class MetadataError extends Error {
  constructor(msg: string) {
    super(msg);
  }
}
class MetadataDoesNotExistError extends MetadataError {
  constructor() {
    super('Metadata does not match');
  }
}

class MetadataDoesNotMatchError extends MetadataError {
  constructor() {
    super('Metadata does not match');
  }
}

class CanNotBeDoneError extends Error {
  constructor() {
    super('Formsync can not be done');
  }
}

@Injectable()
export class ExcelFormSyncService implements IFormSyncService {
  private readonly logger = new Logger(ExcelFormSyncService.name);

  constructor(
    @InjectRepository(ExcelDataSource)
    private dataSourceRepository: Repository<ExcelDataSource>,
    @InjectRepository(FormSync)
    private formsyncRepository: Repository<FormSync>,
    @InjectRepository(DelayedFormSync)
    private delayedFormsyncRepository: Repository<DelayedFormSync>,
    private readonly configService: ConfigService,
    private readonly metadataService: MetadataService,
    private readonly formSyncCommonService: FormSyncCommonService,
    private readonly microsoftService: MicrosoftService,
    private readonly microsoftGraphService: MicrosoftGraphService,
  ) {}

  async run(formsync: FormSync) {
    const { type, payload, dataSourceId } = formsync;
    const dataSource = await this.dataSourceRepository.findOne({
      where: { id: dataSourceId },
    });
    if (!dataSource) {
      throw new ApiError(
        ErrorCode.NO_DATA_EXISTS,
        'Data source does not exist',
      );
    }
    const config = {
      refreshToken: dataSource.refreshToken,
      workbookId: dataSource.workbookId,
      worksheetId: dataSource.worksheetId,
    } as ExcelFormSyncConfig;
    const { workbookId, refreshToken } = config;
    this.logger.log(`Running excel form sync`);
    const accessToken = await this.microsoftService.getAccessTokenWithCache(
      refreshToken,
      dataSource.id,
    );
    const client = await this.microsoftGraphService.createClient(accessToken);
    const sessionId =
      await this.microsoftGraphService.getWorkbookSessionIdWithCache(
        {
          client,
          workbookId,
          persist: true,
        },
        dataSource.id,
      );
    try {
      switch (type) {
        case FormSyncType.INSERT:
          await this.handleInsert({
            dataSourceId: dataSource.id,
            config,
            recordId: payload.recordId,
            data: payload.data,
            sessionId,
            client,
          });
          break;
        case FormSyncType.DELETE:
          await this.handleDelete({
            config,
            rowId: payload.recordId,
            sessionId,
            client,
          });
          break;
        case FormSyncType.UPDATE:
          await this.handleUpdate({
            dataSourceId,
            config,
            rowId: payload.recordId,
            data: payload.data,
            sessionId,
            client,
          });
          break;
        default:
          throw new Error('Unknown form sync type');
      }

      await this.formsyncRepository.delete(formsync.id);
    } catch (error) {
      if (error instanceof CanNotBeDoneError) {
        this.logger.log(`Formsync ${formsync.id} can not be done, delete it`);
        await this.formsyncRepository.delete(formsync.id);
      } else if (error instanceof MetadataError) {
        this.logger.log(`Add delayed formsync for ${formsync.id}`);
        const delayedFormsync = new DelayedFormSync();
        delayedFormsync.formSyncId = formsync.id;
        await this.delayedFormsyncRepository.save(delayedFormsync);
      } else {
        throw error;
      }
    }
  }

  async runRespectMetadata(formsync: FormSync) {
    const { type, payload, dataSourceId } = formsync;
    const dataSource = await this.dataSourceRepository.findOne({
      where: { id: dataSourceId },
    });
    if (!dataSource) {
      this.logger.error(`Data source does not exist`);
      throw new CanNotBeDoneError();
    }
    const config = {
      refreshToken: dataSource.refreshToken,
      workbookId: dataSource.workbookId,
      worksheetId: dataSource.worksheetId,
    } as ExcelFormSyncConfig;
    const { workbookId, refreshToken } = config;
    this.logger.log(`Running excel form sync`);
    const accessToken = await this.microsoftService.getAccessTokenWithCache(
      refreshToken,
      dataSource.id,
    );
    const client = await this.microsoftGraphService.createClient(accessToken);
    const sessionId =
      await this.microsoftGraphService.getWorkbookSessionIdWithCache(
        {
          client,
          workbookId,
          persist: true,
        },
        dataSource.id,
      );
    try {
      switch (type) {
        case FormSyncType.INSERT:
          await this.handleInsert({
            dataSourceId: dataSource.id,
            config,
            recordId: payload.recordId,
            data: payload.data,
            sessionId,
            client,
          });
          break;
        case FormSyncType.DELETE:
          await this.handleDelete({
            config,
            rowId: payload.recordId,
            sessionId,
            client,
          });
          break;
        case FormSyncType.UPDATE:
          await this.handleUpdate({
            dataSourceId,
            config,
            rowId: payload.recordId,
            data: payload.data,
            sessionId,
            client,
          });
          break;
        default:
          throw new Error('Unknown form sync type');
      }

      await this.formsyncRepository.delete(formsync.id);
    } catch (error) {
      if (error instanceof CanNotBeDoneError) {
        this.logger.log(`Formsync ${formsync.id} can not be done, delete it`);
        await this.formsyncRepository.delete(formsync.id);
      } else if (error instanceof MetadataError) {
        this.logger.log(
          `Formsync ${formsync.id} can not be done because metadata is wrong`,
        );
        await this.formsyncRepository.delete(formsync.id);
      } else {
        throw error;
      }
    }
  }

  async handleInsert(params: {
    dataSourceId: string;
    config: ExcelFormSyncConfig;
    recordId?: RecordId;
    data: Record<FieldId, any>;
    sessionId: string;
    client: Client;
  }) {
    const { config, recordId, data, sessionId, client, dataSourceId } = params;
    this.logger.debug(`Insert new record, data: ${JSON.stringify(data)}`);
    const [headers, rowCount, dataSourceSchema, timezone] = await Promise.all([
      this.getWorksheetHashedHeaders({
        client,
        workbookId: config.workbookId,
        worksheetId: config.worksheetId,
        workbookSessionId: sessionId,
        includeHeader: recordId ? true : false,
      }),
      this.metadataService.getExcelRowCount(dataSourceId),
      this.formSyncCommonService.getDataSourceSchema(dataSourceId),
      this.getDataSourceTimezone(dataSourceId),
    ]);
    this.logger.debug(`Row count: ${rowCount}`);
    this.logger.debug(`Headers: ${JSON.stringify(headers)}`);
    if (!rowCount) {
      throw new MetadataDoesNotExistError();
    }
    const lastColIndex = Math.max(...Object.values(headers));
    this.logger.debug(`Last column index: ${lastColIndex}`);
    const newRange = `A${rowCount + 1}:${Utils.convertToExcelColumnName(
      lastColIndex,
    )}${rowCount + 1}`;
    this.logger.debug(`New range: ${newRange}`);
    await this.microsoftGraphService.insertWorksheetRange({
      client,
      workbookId: config.workbookId,
      worksheetId: config.worksheetId,
      workbookSessionId: sessionId,
      rangeAddress: newRange,
      select: ['address'],
    });

    const formatedData = this.convertData(data, dataSourceSchema, { timezone });
    if (recordId) {
      formatedData[EXCEL_HASHED_PRIMARY_ID] = recordId;
    }

    const valuesInsert = new Array(lastColIndex + 1).fill(null);
    let insertCount = 0;
    Object.entries(headers).forEach(([header, pos]) => {
      if (formatedData[header] !== undefined) {
        valuesInsert[pos] = formatedData[header];
        insertCount++;
      }
    });

    if (insertCount === 0) {
      this.logger.debug(`No value to insert`);
      throw new CanNotBeDoneError();
    }
    this.logger.debug(`Values insert: ${JSON.stringify(valuesInsert)}`);
    await this.microsoftGraphService.updateWorksheetRange({
      client,
      workbookId: config.workbookId,
      worksheetId: config.worksheetId,
      workbookSessionId: sessionId,
      rangeAddress: newRange,
      values: [valuesInsert],
      select: ['address'],
    });

    await this.metadataService.increaseExcelRowCount(dataSourceId);
  }

  async handleDelete(data: {
    config: ExcelFormSyncConfig;
    rowId: RecordId;
    sessionId: string;
    client: Client;
  }) {
    const { config, rowId, sessionId, client } = data;
    this.logger.log(`Delete row with id ${rowId}`);
    const [headers, rowPos] = await Promise.all([
      this.getWorksheetHashedHeaders({
        client,
        workbookId: config.workbookId,
        worksheetId: config.worksheetId,
        workbookSessionId: sessionId,
        includeHeader: true,
      }),
      this.metadataService.getExcelRowPos(rowId),
    ]);
    if (!rowPos) {
      this.logger.log(`Cannot delete row ${rowId} because it does not exist`);
      throw new MetadataDoesNotExistError();
    }
    this.logger.debug(`Headers: ${JSON.stringify(headers)}`);
    const idColPos = headers[EXCEL_HASHED_PRIMARY_ID];
    if (!idColPos) {
      this.logger.log(
        `Cannot delete row ${rowId} because id column does not exist`,
      );
      throw new CanNotBeDoneError();
    }

    const curValueInIdCell =
      await this.microsoftGraphService.getWorksheetCellValue({
        client,
        workbookId: config.workbookId,
        worksheetId: config.worksheetId,
        workbookSessionId: sessionId,
        row: rowPos,
        col: idColPos,
      });
    this.logger.debug(`Current value in id cell: ${curValueInIdCell}`);
    if (curValueInIdCell === rowId) {
      const lastColIndex = Math.max(...Object.values(headers));
      const range = `A${rowPos + 1}:${Utils.convertToExcelColumnName(
        lastColIndex,
      )}${rowPos + 1}`;
      this.logger.debug(`Range: ${range}`);
      await this.microsoftGraphService.deleteWorksheetRange({
        client,
        workbookId: config.workbookId,
        worksheetId: config.worksheetId,
        workbookSessionId: sessionId,
        rangeAddress: range,
      });
      this.logger.log(`Deleted row ${rowPos}`);
    } else {
      this.logger.log(`Cannot delete row ${rowId} because id does not match`);
      throw new MetadataDoesNotMatchError();
    }
  }

  async handleUpdate(params: {
    dataSourceId: string;
    config: ExcelFormSyncConfig;
    rowId: RecordId;
    data: Record<FieldId, any>;
    sessionId: string;
    client: Client;
  }) {
    const { dataSourceId, config, rowId, data, sessionId, client } = params;
    this.logger.log(`Update row with id ${rowId}`);

    const [headers, rowPos, dataSourceSchema, timezone] = await Promise.all([
      this.getWorksheetHashedHeaders({
        client,
        workbookId: config.workbookId,
        worksheetId: config.worksheetId,
        workbookSessionId: sessionId,
        includeHeader: true,
      }),
      this.metadataService.getExcelRowPos(rowId),
      this.formSyncCommonService.getDataSourceSchema(dataSourceId),
      this.getDataSourceTimezone(dataSourceId),
    ]);
    this.logger.debug(`Headers: ${JSON.stringify(headers)}`);
    if (!rowPos) {
      this.logger.log(`Cannot delete row ${rowId} because it does not exist`);
      throw new MetadataDoesNotExistError();
    }

    const idColPos = headers[EXCEL_HASHED_PRIMARY_ID];
    if (!idColPos) {
      this.logger.log(
        `Cannot update row ${rowId} because id column does not exist`,
      );
      throw new CanNotBeDoneError();
    }
    const curValueInIdCell =
      await this.microsoftGraphService.getWorksheetCellValue({
        client,
        workbookId: config.workbookId,
        worksheetId: config.worksheetId,
        workbookSessionId: sessionId,
        row: rowPos,
        col: idColPos,
      });
    this.logger.debug(`Current value in id cell: ${curValueInIdCell}`);

    if (curValueInIdCell === rowId) {
      const formatedData = this.convertData(data, dataSourceSchema, {
        timezone,
      });

      const lastColIndex = Math.max(...Object.values(headers));
      const range = `A${rowPos + 1}:${Utils.convertToExcelColumnName(
        lastColIndex,
      )}${rowPos + 1}`;
      this.logger.debug(`Range: ${range}`);

      const valuesUpdate = new Array(lastColIndex + 1).fill(null);
      let updateCount = 0;
      Object.entries(headers).forEach(([header, pos]) => {
        if (formatedData[header] && header !== EXCEL_HASHED_PRIMARY_ID) {
          valuesUpdate[pos] = formatedData[header];
          updateCount++;
        }
      });
      this.logger.debug(`Values update: ${JSON.stringify(valuesUpdate)}`);

      if (updateCount === 0) {
        this.logger.log(`Nothing to update for row ${rowId}`);
        throw new CanNotBeDoneError();
      }
      await this.microsoftGraphService.updateWorksheetRange({
        client,
        workbookId: config.workbookId,
        worksheetId: config.worksheetId,
        workbookSessionId: sessionId,
        rangeAddress: range,
        values: [valuesUpdate],
        select: ['address'],
      });
      this.logger.log(`Updated row ${rowPos}`);
    } else {
      this.logger.log(`Cannot update row ${rowId} because id does not match`);
      throw new MetadataDoesNotMatchError();
    }
  }

  async updateMetadata(dataSourceId: string) {
    this.logger.log(`Updating metadata for ds: ${dataSourceId}`);
    const time = new Date();
    const dataSource = await this.dataSourceRepository.findOne({
      where: { id: dataSourceId },
    });
    if (!dataSource) {
      this.logger.warn(`Data source ${dataSourceId} does not exist`);
      return;
    }
    const accessToken = await this.microsoftService.getAccessToken(
      dataSource.refreshToken,
    );
    const [cTag, metadataCTag] = await Promise.all([
      this.microsoftGraphService
        .getWorkbookFileInfo({
          client: await this.microsoftGraphService.createClient(accessToken),
          workbookId: dataSource.workbookId,
          select: ['cTag'],
        })
        .then((res) => res.cTag),
      this.metadataService.getExcelCTag(dataSourceId),
    ]);

    if (cTag === metadataCTag) {
      this.logger.log(`Metadata for ds ${dataSourceId} is up to date`);
      return;
    }

    const metadataUrl = this.configService.get(
      `${ConfigName.MODULE}.metadataUrl`,
    );
    try {
      await axios.post(`${metadataUrl}/api/v1/excel/update`, {
        dataSourceId,
        workbookId: dataSource.workbookId,
        worksheetId: dataSource.worksheetId,
        accessToken: accessToken,
      });
    } catch (err) {
      this.logger.error(
        `Error updating metadata for ds ${dataSourceId}: ${err.message}`,
      );
    }
    await Promise.all([
      this.dataSourceRepository.update(dataSourceId, {
        metadataSyncedAt: time,
      }),
      this.metadataService.updateExcelCTag(dataSourceId, cTag),
    ]);

    this.logger.log(`Updated metadata for ds: ${dataSourceId}`);
  }

  private async getWorksheetHashedHeaders(data: {
    client: Client;
    workbookId: string;
    worksheetId: string;
    workbookSessionId: string;
    includeHeader?: boolean;
  }) {
    const headers = {};
    const headerNameSet = new Set();
    const headerValues = await this.microsoftGraphService.getWorksheetRowValues(
      {
        client: data.client,
        workbookId: data.workbookId,
        worksheetId: data.worksheetId,
        workbookSessionId: data.workbookSessionId,
        row: 0,
      },
    );
    headerValues.forEach((header, index) => {
      if (
        header !== '' &&
        (data.includeHeader ? true : header !== EXCEL_PRIMARY_ID_NAME)
      ) {
        if (!headerNameSet.has(header)) {
          headers[Utils.hashFieldName(header)] = index;
          headerNameSet.add(header);
        } else {
          // add postfix to duplicated header
          let postfix = 1;
          const postfixedHeader = `${header} (${postfix})`;
          this.logger.debug(`Postfixing header: ${postfixedHeader}`);
          while (headerNameSet.has(postfixedHeader)) {
            postfix++;
          }
          headers[Utils.hashFieldName(header)] = index;
          headerNameSet.add(postfixedHeader);
        }
      }
    });
    return headers as Record<string, number>;
  }

  async getDataSourceTimezone(dataSourceId: string) {
    return this.dataSourceRepository
      .findOne({
        where: { id: dataSourceId },
        select: ['timezone'],
      })
      .then((res) => res.timezone);
  }

  convertData(
    data: Record<FieldId, any>,
    schema: DataSourceSchema,
    config: {
      timezone: string;
    },
  ): Record<FieldId, any> {
    const timezone = config.timezone || 'UTC';
    const result = {};
    Object.entries(data).forEach(([key, value]) => {
      const schemaField = schema[key];
      if (!schemaField) {
        return;
      }
      if (schemaField.type === NativeDataType.Date) {
        const date = new Date(value);
        result[key] = Utils.convertDateToSerialNumber(date, timezone);
      } else {
        result[key] = value;
      }
    });
    return result;
  }
}

export * from './job';
