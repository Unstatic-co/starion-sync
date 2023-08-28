import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sheets } from '@googleapis/sheets';
import { drive, drive_v3 as DriveV3 } from '@googleapis/drive';
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
    this.logger.debug(`Getting spreadsheet: ${data.spreadsheetId}`);
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

    const resp = await d.files.watch({
      fileId,
      requestBody,
      fields: 'id,resourceId',
    });

    const { id, resourceId } = resp.data;

    return { channelId: id, resourceId };
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
    this.logger.log(
      `Stopped ggdrive file change webhook, webhookId = ${data.webhookId}`,
    );
  }
}
