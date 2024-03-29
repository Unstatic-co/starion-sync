import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drive, drive_v3 as DriveV3 } from '@googleapis/drive';
import { sheets, sheets_v4 as SheetsV4 } from '@googleapis/sheets';
import { OAuth2Client } from 'google-auth-library';
import { handleDriveFileError, handleSpreadSheetError } from './error-handler';
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
    client: OAuth2Client;
    spreadsheetId: string;
    fields?: string[];
  }) {
    this.logger.debug(`Getting spreadsheet: ${data.spreadsheetId}`);
    try {
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
      return res.data;
    } catch (error) {
      handleSpreadSheetError(error);
    }
  }

  async getRangeValue(data: {
    client: SheetsV4.Sheets;
    spreadsheetId: string;
    range: string;
  }) {
    this.logger.debug(
      `Getting rannge values, speadsheetId = ${data.spreadsheetId}`,
    );
    try {
      const { client, spreadsheetId, range } = data;
      const params = {
        spreadsheetId,
        range,
        fields: 'values',
      };
      const res = await client.spreadsheets.values.get(params);
      return res.data.values || [];
    } catch (error) {
      handleSpreadSheetError(error);
    }
  }

  async registerFileChangeWebhook(data: {
    client: OAuth2Client;
    webhookId: string;
    fileId: string;
    webhookUrl: string;
    expiration: number; // timestamp
    // resourceId: string;
    token?: string;
    params?: Record<string, string>;
  }) {
    const {
      client,
      webhookId,
      fileId,
      // resourceId,
      webhookUrl,
      expiration,
      token,
      params,
    } = data;
    this.logger.debug(`Registering ggdrive file change webhook for: ${fileId}`);
    const d = drive({
      version: 'v3',
      auth: client,
    });

    const requestBody = {
      id: webhookId,
      kind: 'api#channel',
      address: webhookUrl,
      type: 'web_hook',
      expiration: expiration.toString(),
      payload: true,
      // resourceId,
    } as DriveV3.Schema$Channel;
    token && Object.assign(requestBody, { token });
    params && Object.assign(requestBody, { params });

    try {
      const resp = await d.files.watch({
        fileId,
        requestBody,
        fields: 'id,resourceId',
      });
      const { id, resourceId } = resp.data;

      return { channelId: id, resourceId };
    } catch (err) {
      handleDriveFileError(err);
    }
  }

  async stopFileChangeWebhook(data: {
    client: OAuth2Client;
    webhookId: string;
    resourceId: string;
  }) {
    this.logger.log(
      `Stopping ggdrive file change webhook, webhookId = ${data.webhookId}`,
    );
    const { client, webhookId, resourceId } = data;
    try {
      const d = drive({
        version: 'v3',
        auth: client,
      });
      await d.channels.stop({
        requestBody: {
          id: webhookId,
          resourceId,
        },
      });
    } catch (error) {
      handleDriveFileError(error);
    }
    this.logger.log(
      `Stopped ggdrive file change webhook, webhookId = ${data.webhookId}`,
    );
  }
}
