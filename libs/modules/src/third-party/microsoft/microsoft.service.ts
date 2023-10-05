import {
  ConfidentialClientApplication,
  RefreshTokenRequest,
} from '@azure/msal-node';
import { ConfigName } from '@lib/core/config';
import { InjectTokens } from '@lib/modules/inject-tokens';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthProvider,
  AuthProviderCallback,
  Client,
  Options,
} from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
import { pick } from 'lodash';
import { DiscoveredExcelDataSource } from 'apps/configurator/src/modules/discoverer/discoverer.interface';
import { GetFileInfoResponse, GetRangeResponse } from './microsoft.interface';
import {
  handleAuthApiError,
  handleFileError,
  handleWorkbookError,
  handleWorksheetError,
} from './error-handler';
import { handleDriveFileError } from '../google/error-handler';

@Injectable()
export class MicrosoftService {
  private readonly logger = new Logger(MicrosoftService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(InjectTokens.MICROSOFT_AUTH_CLIENT)
    private readonly microsoftAuthClient: ConfidentialClientApplication,
  ) {}

  async getAccessToken(refreshToken: string) {
    const scopes = this.configService.get<string[]>(
      `${ConfigName.MICROSOFT}.scopes`,
    );
    const byRefreshTokenRequest = {
      scopes,
      refreshToken,
    } as RefreshTokenRequest;

    try {
      const response =
        await this.microsoftAuthClient.acquireTokenByRefreshToken(
          byRefreshTokenRequest,
        );
      return response.accessToken;
    } catch (error) {
      handleAuthApiError(error);
    }
  }
}

@Injectable()
export class MicrosoftGraphService {
  private readonly logger = new Logger(MicrosoftGraphService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(InjectTokens.MICROSOFT_AUTH_CLIENT)
    private readonly microsoftAuthClient: ConfidentialClientApplication,
  ) {}

  async createClient(accessToken: string) {
    const authProvider: AuthProvider = (callback: AuthProviderCallback) => {
      callback(null, accessToken);
    };
    const options: Options = {
      authProvider,
    };
    const client = Client.init(options);
    return client;
  }

  async createWorkbookSession(
    client: Client,
    workbookId: string,
    persist?: boolean,
  ) {
    this.logger.debug(`createWorkbookSession(): workbookId = ${workbookId}`);
    try {
      const workbookSession = await client
        .api(`/me/drive/items/${workbookId}/workbook/createSession`)
        .post({
          persistChanges: persist === true,
        });
      return workbookSession.id;
    } catch (error) {
      handleWorkbookError(error);
    }
  }

  async closeWorkbookSession(
    client: Client,
    workbookId: string,
    sessionId: string,
  ) {
    this.logger.debug(`closeWorkbookSession(): workbookId = ${workbookId}`);
    try {
      await client
        .api(`/me/drive/items/${workbookId}/workbook/closeSession`)
        .header('workbook-session-id', sessionId)
        .post({});
    } catch (error) {
      this.logger.debug(`closeWorkbookSession(): error = ${error.message}`);
    }
  }

  async getWorksheet(
    client: Client,
    workbookId: string,
    worksheetId: string,
    options?: {
      select?: string[];
      workbookSessionId?: string;
    },
  ) {
    this.logger.debug(
      `getWorksheet(): workbookId = ${workbookId} worksheetId = ${worksheetId}`,
    );
    let url = `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}`;
    if (options?.select?.length) {
      url = url.concat(`?$select=${options.select.join(',')}`);
    }
    let api = client.api(url);
    if (options?.workbookSessionId) {
      api = api.header('workbook-session-id', options.workbookSessionId);
    }

    try {
      const worksheet = await api.get();
      return worksheet;
    } catch (error) {
      handleWorksheetError(error);
    }
  }

  async listWorksheets(
    client: Client,
    workbookId: string,
    workbookSessionId?: string,
  ) {
    this.logger.debug(`listWorksheets(): workbookId = ${workbookId}`);
    let api = client.api(`/me/drive/items/${workbookId}/workbook/worksheets`);
    if (workbookSessionId) {
      api = api.header('workbook-session-id', workbookSessionId);
    }

    try {
      const worksheets = await api.get();

      // this.logger.debug(`listWorksheets(): worksheets = ${worksheets}`);
      return worksheets.value.map((worksheet) =>
        pick(worksheet, ['id', 'name', 'position', 'visibility']),
      ) as DiscoveredExcelDataSource[];
    } catch (error) {
      handleWorksheetError(error);
    }
  }

  async getWorkbookFileInfo(data: {
    client: Client;
    workbookId: string;
    workbookSessionId?: string;
    select?: string[];
  }): Promise<GetFileInfoResponse> {
    const { client, workbookId, workbookSessionId, select } = data;
    this.logger.debug(`getWorkbookFileInfo(): workbookId = ${workbookId}`);
    let url = `/me/drive/items/${workbookId}`;
    if (select?.length) {
      url = url.concat(`?$select=${select.join(',')}`);
    }
    try {
      let api = await client.api(url);
      if (workbookSessionId) {
        api = api.header('workbook-session-id', workbookSessionId);
      }
      const fileInfo = await api.get();
      return fileInfo;
    } catch (error) {
      handleFileError(error);
    }
  }

  async getWorksheetUsedRangeRow(data: {
    client: Client;
    workbookId: string;
    worksheetId: string;
    row: number;
    workbookSessionId?: string;
    select?: string[];
  }): Promise<GetRangeResponse> {
    const { client, workbookId, workbookSessionId, row, worksheetId, select } =
      data;
    this.logger.debug(
      `getWorksheetRow(): ${JSON.stringify({
        workbookId,
        worksheetId,
        row,
      })}`,
    );
    try {
      let url = `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range/usedRange/row(row=${row})`;
      if (select?.length) {
        url = url.concat(`?$select=${select.join(',')}`);
      }
      let api = await client.api(url);
      if (workbookSessionId) {
        api = api.header('workbook-session-id', workbookSessionId);
      }
      const res = await api.get();
      return res;
    } catch (error) {
      handleWorksheetError(error);
    }
  }

  async getWorksheetUsedRangeRowValues(data: {
    client: Client;
    workbookId: string;
    worksheetId: string;
    row: number;
    workbookSessionId?: string;
    select?: string[];
  }): Promise<any[]> {
    return this.getWorksheetUsedRangeRow({ ...data, select: ['values'] }).then(
      (res) => res.values[0],
    );
  }

  async getWorksheetUsedRange(data: {
    client: Client;
    workbookId: string;
    worksheetId: string;
    workbookSessionId?: string;
    select?: string[];
  }) {
    const { client, workbookId, workbookSessionId, worksheetId, select } = data;
    try {
      let url = `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range/usedRange`;
      if (select?.length) {
        url = url.concat(`?$select=${select.join(',')}`);
      }
      let api = await client.api(url);
      if (workbookSessionId) {
        api = api.header('workbook-session-id', workbookSessionId);
      }
      const res = await api.get();
      return res;
    } catch (error) {
      handleWorksheetError(error);
    }
  }
}
