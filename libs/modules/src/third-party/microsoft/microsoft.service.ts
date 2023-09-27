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
import { GetFileInfoResponse } from './microsoft.interface';
import { handleAuthApiError, handleWorkbookError } from './error-handler';
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
    this.logger.debug(`getAccessToken(): scopes = ${scopes}`);
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
    this.logger.debug(`createGraphClient(): accessToken = ${accessToken}`);

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
      this.logger.debug(
        `createWorkbookSession(): workbookSessionId = ${workbookSession.id}`,
      );
      return workbookSession.id;
    } catch (error) {
      handleWorkbookError(error);
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
    const url = `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}`;
    if (options?.select?.length) {
      url.concat(`?$select=${options.select.join(',')}`);
    }
    let api = client.api(url);
    if (options?.workbookSessionId) {
      api = api.header('workbook-session-id', options.workbookSessionId);
    }

    try {
      const worksheet = await api.get();
      return worksheet;
    } catch (error) {
      handleWorkbookError(error);
    }
  }

  async listWorksheets(
    client: Client,
    workbookId: string,
    workbookSessionId?: string,
  ) {
    this.logger.debug(`listWorksheets(): workbookId = ${workbookId}`);
    this.logger.debug(
      `listWorksheets(): workbookSessionId = ${workbookSessionId}`,
    );
    let api = client.api(`/me/drive/items/${workbookId}/workbook/worksheets`);
    if (workbookSessionId) {
      api = api.header('workbook-session-id', workbookSessionId);
    }

    try {
      const worksheets = await api.get();

      this.logger.debug(`listWorksheets(): worksheets = ${worksheets}`);
      return worksheets.value.map((worksheet) =>
        pick(worksheet, ['id', 'name', 'position', 'visibility']),
      ) as DiscoveredExcelDataSource[];
    } catch (error) {
      handleWorkbookError(error);
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
    const url = `/me/drive/items/${workbookId}`;
    if (select?.length) {
      url.concat(`?$select=${select.join(',')}`);
    }
    try {
      let api = await client.api(url);
      if (workbookSessionId) {
        api = api.header('workbook-session-id', workbookSessionId);
      }
      const fileInfo = await api.get();
      return fileInfo;
    } catch (error) {
      handleDriveFileError(error);
    }
  }
}
