import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sheets, sheets_v4 as SheetsV4 } from '@googleapis/sheets';
import { OAuth2Client } from 'google-auth-library';
import { GoogleService } from './google.service';

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly googleService: GoogleService,
  ) {}

  async createSheetsClient(refreshToken: string) {
    const authClient = await this.googleService.createAuthClient(refreshToken);
    const s = sheets({ version: 'v4', auth: authClient });
    return s;
  }

  async getSpreadSheets(data: {
    client: SheetsV4.Sheets;
    spreadsheetId: string;
    fields?: string[];
  }) {
    this.logger.debug(`Getting spreadsheet: ${data.spreadsheetId}`);
    const { client, spreadsheetId, fields } = data;
    const params = {
      spreadsheetId,
      includeGridData: false,
    };
    if (fields?.length) {
      Object.assign(params, { fields: fields.join(',') });
    }
    const res = await client.spreadsheets.get(params);
    if (res.status !== HttpStatus.OK) {
      throw new Error(`Error getting spreadsheet: ${res.statusText}`);
    }
    return res.data;
  }

  async updateRangeValue(data: {
    client: SheetsV4.Sheets;
    spreadsheetId: string;
    range: string;
    values: any[][];
  }) {
    this.logger.debug(`Updating sheet values`);
    const { client, spreadsheetId, range, values } = data;
    const params = {
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
      fields: '',
    };
    const res = await client.spreadsheets.values.update(params);
    if (res.status !== HttpStatus.OK) {
      throw new Error(`Error updating sheet values: ${res.statusText}`);
    }
    return res.data;
  }

  async getRangeValue(data: {
    client: SheetsV4.Sheets;
    spreadsheetId: string;
    range: string;
  }) {
    this.logger.debug(`Getting rannge values`);
    const { client, spreadsheetId, range } = data;
    const params = {
      spreadsheetId,
      range,
      fields: 'values',
    };
    const res = await client.spreadsheets.values.get(params);
    if (res.status !== HttpStatus.OK) {
      throw new Error(`Error getting range values: ${res.statusText}`);
    }
    return res.data.values;
  }

  async getCellValue(data: {
    client: SheetsV4.Sheets;
    spreadsheetId: string;
    rowPos: number;
    colPos: number;
    sheetName: string;
  }) {
    this.logger.debug(`Getting cell values`);
    const { client, spreadsheetId, rowPos, colPos, sheetName } = data;
    const value = await this.getRangeValue({
      client,
      spreadsheetId,
      range: `${sheetName}!R${rowPos}C${colPos}:R${rowPos}C${colPos}`,
    });
    if (value?.length) {
      return value[0][0];
    } else {
      return null;
    }
  }

  async addEmptyRow(data: {
    client: SheetsV4.Sheets;
    spreadsheetId: string;
    sheetId: string;
    position: number; // from 1
  }) {
    this.logger.debug(`Adding empty row`);
    const { client, spreadsheetId, sheetId, position } = data;
    const params = {
      spreadsheetId,
      resource: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: position - 1,
                endIndex: position,
              },
              inheritFromBefore: true,
            },
          },
        ],
      },
      fields: '',
    };
    const res = await client.spreadsheets.batchUpdate(params);
    if (res.status !== HttpStatus.OK) {
      throw new Error(`Error adding empty row: ${res.statusText}`);
    }
    return res.data;
  }

  async deleteRow(data: {
    client: SheetsV4.Sheets;
    spreadsheetId: string;
    sheetId: string;
    position: number; // from 1
  }) {
    this.logger.debug(`Deleting row`);
    const { client, spreadsheetId, sheetId, position } = data;
    const params = {
      spreadsheetId,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: position - 1,
                endIndex: position,
              },
            },
          },
        ],
      },
      fields: '',
    };
    const res = await client.spreadsheets.batchUpdate(params);
    if (res.status !== HttpStatus.OK) {
      throw new Error(`Error deleting empty rows: ${res.statusText}`);
    }
    return res.data;
  }
}
