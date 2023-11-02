import { Injectable, Logger } from '@nestjs/common';
import { IFormSyncService } from '../formsync.factory';
import { Utils } from 'src/utils';
import { FormSyncType } from 'src/lib/formsync';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DelayedFormSync, FormSync } from 'src/entities';
import { Repository } from 'typeorm';
import {
  DataSourceSchema,
  FieldId,
  GOOGLE_SHEETS_HASHED_PRIMARY_ID,
  GOOGLE_SHEETS_PRIMARY_ID_NAME,
  NativeDataType,
  RecordId,
} from 'src/lib/schema';
import { ApiError } from 'src/common/exception';
import { ErrorCode } from 'src/common/constants';
import { ConfigService } from '@nestjs/config';
import { MetadataService } from 'src/modules/metadata/metadata.service';
import { GoogleSheetsDataSource } from 'src/entities/google-sheets';
import {
  GoogleService,
  GoogleSheetsService,
} from 'src/modules/third-party/google';
import { sheets_v4 as SheetsV4 } from '@googleapis/sheets';
import { ConfigName } from 'src/config';
import axios from 'axios';
import { FormSyncCommonService } from '../common.service';

export type GoogleSheetsFormSyncConfig = {
  refreshToken: string;
  spreadsheetId: string;
  sheetId: string;
  sheetName: string;
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
export class GoogleSheetsFormSyncService implements IFormSyncService {
  private readonly logger = new Logger(GoogleSheetsFormSyncService.name);

  constructor(
    @InjectRepository(DataSource)
    private commonDataSourceRepository: Repository<DataSource>,
    @InjectRepository(GoogleSheetsDataSource)
    private dataSourceRepository: Repository<GoogleSheetsDataSource>,
    @InjectRepository(FormSync)
    private formsyncRepository: Repository<FormSync>,
    @InjectRepository(DelayedFormSync)
    private delayedFormsyncRepository: Repository<DelayedFormSync>,
    private readonly configService: ConfigService,
    private readonly metadataService: MetadataService,
    private readonly formSyncCommonService: FormSyncCommonService,
    private readonly googleService: GoogleService,
    private readonly googleSheetsService: GoogleSheetsService,
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
      spreadsheetId: dataSource.spreadsheetId,
      sheetId: dataSource.sheetId,
    } as GoogleSheetsFormSyncConfig;
    const { refreshToken } = config;
    this.logger.log(`Running google sheets form sync`);
    const client = await this.googleSheetsService.createSheetsClient(
      refreshToken,
    );
    try {
      switch (type) {
        case FormSyncType.INSERT:
          await this.handleInsert({
            dataSourceId: dataSource.id,
            config,
            recordId: payload.recordId,
            data: payload.data,
            client,
          });
          break;
        case FormSyncType.DELETE:
          await this.handleDelete({
            config,
            rowId: payload.recordId,
            client,
          });
          break;
        case FormSyncType.UPDATE:
          await this.handleUpdate({
            dataSourceId,
            config,
            rowId: payload.recordId,
            data: payload.data,
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
      spreadsheetId: dataSource.spreadsheetId,
      sheetId: dataSource.sheetId,
    } as GoogleSheetsFormSyncConfig;
    const { refreshToken } = config;
    this.logger.log(`Running google sheets form sync`);
    const client = await this.googleSheetsService.createSheetsClient(
      refreshToken,
    );
    try {
      switch (type) {
        case FormSyncType.INSERT:
          await this.handleInsert({
            dataSourceId: dataSource.id,
            config,
            recordId: payload.recordId,
            data: payload.data,
            client,
          });
          break;
        case FormSyncType.DELETE:
          await this.handleDelete({
            config,
            rowId: payload.recordId,
            client,
          });
          break;
        case FormSyncType.UPDATE:
          await this.handleUpdate({
            dataSourceId,
            config,
            rowId: payload.recordId,
            data: payload.data,
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
    config: GoogleSheetsFormSyncConfig;
    recordId?: RecordId;
    data: Record<FieldId, any>;
    client: SheetsV4.Sheets;
  }) {
    const { config, recordId, data, client, dataSourceId } = params;
    const { spreadsheetId, sheetId } = config;
    this.logger.debug(`Insert new record for ds ${dataSourceId}`);
    const sheetName = await this.getSheetName({
      client,
      spreadsheetId,
      sheetId,
    });
    const [headers, rowCount, dataSourceSchema, timezone] = await Promise.all([
      this.getHashedHeaders({
        client,
        spreadsheetId,
        sheetName,
        includeHeader: recordId ? true : false,
      }),
      this.metadataService.getGoogleSheetsRowCount(dataSourceId),
      this.formSyncCommonService.getDataSourceSchema(dataSourceId),
      this.getSpreadsheetsTimezone({
        client,
        spreadsheetId,
      }),
    ]);
    this.logger.debug(`Row count: ${rowCount}`);
    this.logger.debug(`Headers: ${JSON.stringify(headers)}`);
    if (!rowCount) {
      throw new MetadataDoesNotExistError();
    }
    const lastColIndex = Math.max(...Object.values(headers));
    this.logger.debug(`Last column index: ${lastColIndex}`);
    const newRange = `${sheetName}!R${rowCount + 1}C1:R${rowCount + 1}C${
      lastColIndex + 1
    }`;

    const formatedData = this.convertData(data, dataSourceSchema, { timezone });
    if (recordId) {
      formatedData[GOOGLE_SHEETS_HASHED_PRIMARY_ID] = recordId;
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

    await this.googleSheetsService.addEmptyRow({
      client,
      spreadsheetId,
      sheetId,
      position: rowCount + 1,
    });

    await this.googleSheetsService.updateRangeValue({
      client,
      spreadsheetId,
      range: newRange,
      values: [valuesInsert],
    });

    await this.metadataService.increaseGoogleSheetsRowCount(dataSourceId);
  }

  async handleDelete(data: {
    config: GoogleSheetsFormSyncConfig;
    rowId: RecordId;
    client: SheetsV4.Sheets;
  }) {
    const { config, rowId, client } = data;
    const { spreadsheetId, sheetId } = config;
    this.logger.log(`Delete row with id ${rowId}`);
    const sheetName = await this.getSheetName({
      client,
      spreadsheetId,
      sheetId,
    });
    const [headers, rowPos] = await Promise.all([
      this.getHashedHeaders({
        client,
        spreadsheetId,
        sheetName,
        includeHeader: true,
      }),
      this.metadataService.getGoogleSheetsRowPos(rowId),
    ]);
    if (!rowPos) {
      this.logger.log(`Cannot delete row ${rowId} because it does not exist`);
      throw new MetadataDoesNotExistError();
    }
    this.logger.debug(`Headers: ${JSON.stringify(headers)}`);
    const idColPos = headers[GOOGLE_SHEETS_HASHED_PRIMARY_ID];
    if (!idColPos) {
      this.logger.log(
        `Cannot delete row ${rowId} because id column does not exist`,
      );
      throw new CanNotBeDoneError();
    }
    const curValueInIdCell = await this.googleSheetsService.getCellValue({
      client,
      spreadsheetId,
      sheetName,
      rowPos: rowPos + 1,
      colPos: idColPos + 1,
    });
    this.logger.debug(`Current value in id cell: ${curValueInIdCell}`);
    if (curValueInIdCell === rowId) {
      const lastColIndex = Math.max(...Object.values(headers));
      const range = `${sheetName}!R${rowPos + 1}C1:R${rowPos + 1}C${
        lastColIndex + 1
      }`;
      this.logger.debug(`Range: ${range}`);
      await this.googleSheetsService.deleteRow({
        client,
        spreadsheetId,
        sheetId,
        position: rowPos + 1,
      });
      this.logger.log(`Deleted row ${rowPos}`);
    } else {
      this.logger.log(`Cannot delete row ${rowId} because id does not match`);
      throw new MetadataDoesNotMatchError();
    }
  }

  async handleUpdate(params: {
    dataSourceId: string;
    config: GoogleSheetsFormSyncConfig;
    rowId: RecordId;
    data: Record<FieldId, any>;
    client: SheetsV4.Sheets;
  }) {
    const { dataSourceId, config, rowId, data, client } = params;
    const { spreadsheetId, sheetId } = config;
    this.logger.log(`Update row with id ${rowId}`);
    const sheetName = await this.getSheetName({
      client,
      spreadsheetId,
      sheetId,
    });
    const [headers, rowPos, dataSourceSchema, timezone] = await Promise.all([
      this.getHashedHeaders({
        client,
        spreadsheetId,
        sheetName,
        includeHeader: true,
      }),
      this.metadataService.getGoogleSheetsRowPos(rowId),
      this.formSyncCommonService.getDataSourceSchema(dataSourceId),
      this.getSpreadsheetsTimezone({
        client,
        spreadsheetId,
      }),
    ]);
    this.logger.debug(`Headers: ${JSON.stringify(headers)}`);
    if (!rowPos) {
      this.logger.log(`Cannot delete row ${rowId} because it does not exist`);
      throw new MetadataDoesNotExistError();
    }
    const idColPos = headers[GOOGLE_SHEETS_HASHED_PRIMARY_ID];
    if (!idColPos) {
      this.logger.log(
        `Cannot update row ${rowId} because id column does not exist`,
      );
      throw new CanNotBeDoneError();
    }
    const curValueInIdCell = await this.googleSheetsService.getCellValue({
      client,
      spreadsheetId,
      sheetName,
      rowPos: rowPos + 1,
      colPos: idColPos + 1,
    });
    this.logger.debug(`Current value in id cell: ${curValueInIdCell}`);
    if (curValueInIdCell === rowId) {
      const formatedData = this.convertData(data, dataSourceSchema, {
        timezone,
      });

      const lastColIndex = Math.max(...Object.values(headers));
      const range = `${sheetName}!R${rowPos + 1}C1:R${rowPos + 1}C${
        lastColIndex + 1
      }`;
      this.logger.debug(`Range: ${range}`);
      const valuesUpdate = new Array(lastColIndex + 1).fill(null);
      let updateCount = 0;
      Object.entries(headers).forEach(([header, pos]) => {
        if (
          formatedData[header] &&
          header !== GOOGLE_SHEETS_HASHED_PRIMARY_ID
        ) {
          valuesUpdate[pos] = formatedData[header];
          updateCount++;
        }
      });
      this.logger.debug(`Values update: ${JSON.stringify(valuesUpdate)}`);
      if (updateCount === 0) {
        this.logger.log(`Nothing to update for row ${rowId}`);
        throw new CanNotBeDoneError();
      }
      await this.googleSheetsService.updateRangeValue({
        client,
        spreadsheetId,
        range,
        values: [valuesUpdate],
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
    const accessToken = await this.googleService.getAccessToken(
      dataSource.refreshToken,
    );
    const metadataUrl = this.configService.get(
      `${ConfigName.MODULE}.metadataUrl`,
    );
    try {
      await axios.post(`${metadataUrl}/api/v1/google-sheets/update`, {
        dataSourceId,
        accessToken: accessToken,
        spreadsheetId: dataSource.spreadsheetId,
        sheetId: dataSource.sheetId,
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
    ]);
    this.logger.log(`Updated metadata for ds: ${dataSourceId}`);
  }

  private async getSheetName(data: {
    client: SheetsV4.Sheets;
    spreadsheetId: string;
    sheetId: string;
  }) {
    const { client, spreadsheetId, sheetId } = data;
    const res = await this.googleSheetsService.getSpreadSheets({
      client,
      spreadsheetId,
      fields: ['sheets.properties.sheetId', 'sheets.properties.title'],
    });
    const sheet = res.sheets.find(
      (s) => s.properties.sheetId.toString() === sheetId,
    );
    if (!sheet) {
      return null;
    }
    return sheet.properties.title;
  }

  private async getHashedHeaders(data: {
    client: SheetsV4.Sheets;
    spreadsheetId: string;
    sheetName: string;
    includeHeader?: boolean;
  }) {
    const headers = {};
    const headerNameSet = new Set();
    const headerValues = (
      await this.googleSheetsService.getRangeValue({
        client: data.client,
        spreadsheetId: data.spreadsheetId,
        range: `${data.sheetName}!A1:Z1`,
      })
    )[0];
    headerValues.forEach((header, index) => {
      if (
        header !== '' &&
        (data.includeHeader ? true : header !== GOOGLE_SHEETS_PRIMARY_ID_NAME)
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
          headers[Utils.hashFieldName(postfixedHeader)] = index;
          headerNameSet.add(postfixedHeader);
        }
      }
    });
    return headers as Record<string, number>;
  }

  async getSpreadsheetsTimezone(data: {
    client: SheetsV4.Sheets;
    spreadsheetId: string;
  }) {
    return this.googleSheetsService
      .getSpreadSheets({
        client: data.client,
        spreadsheetId: data.spreadsheetId,
        fields: ['properties.timeZone'],
      })
      .then((res) => res.properties.timeZone);
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
