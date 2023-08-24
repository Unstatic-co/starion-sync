import { InjectTokens } from '@lib/modules/inject-tokens';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sheets } from '@googleapis/sheets';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);

  constructor(private readonly configService: ConfigService) {}

  async getSpreadSheets(data: {
    client: OAuth2Client;
    spreadsheetId: string;
    fields?: string[];
  }) {
    const { client, spreadsheetId, fields } = data;
    const s = sheets({ version: 'v4', auth: client });
    const params = {
      spreadsheetId,
      includeGridData: false,
    };
    if (fields?.length) {
      Object.assign(params, { fields: fields.join(',') });
    }
    const res = await s.spreadsheets.get(params);
    if (res.status !== HttpStatus.OK) {
      throw new Error(`Error getting spreadsheet: ${res.statusText}`);
    }
    return res.data;
  }
}
