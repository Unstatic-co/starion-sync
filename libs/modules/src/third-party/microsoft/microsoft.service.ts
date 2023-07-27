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

@Injectable()
export class MicrosoftService {
  private readonly logger = new Logger(MicrosoftService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(InjectTokens.MICROSOFT_AUTH_CLIENT)
    private readonly microsoftAuthClient: ConfidentialClientApplication,
  ) {}

  async getAccessToken(refreshToken: string) {
    this.logger.debug(`getAccessToken(): refreshToken = ${refreshToken}`);
    const scopes = this.configService.get<string[]>(
      `${ConfigName.MICROSOFT}.scopes`,
    );
    const byRefreshTokenRequest = {
      scopes,
      refreshToken,
    } as RefreshTokenRequest;

    const response = await this.microsoftAuthClient.acquireTokenByRefreshToken(
      byRefreshTokenRequest,
    );
    return response.accessToken;
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
    const workbookSession = await client
      .api(`/me/drive/items/${workbookId}/workbook/createSession`)
      .post({
        persistChanges: persist === true,
      });
    this.logger.debug(
      `createWorkbookSession(): workbookSessionId = ${workbookSession.id}`,
    );
    return workbookSession.id;
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
    const worksheets = await api.get();

    this.logger.debug(`listWorksheets(): worksheets = ${worksheets}`);
    return worksheets.value.map((worksheet) =>
      pick(worksheet, ['id', 'name', 'position', 'visibility']),
    ) as DiscoveredExcelDataSource[];
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
    let api = await client.api(url);
    if (workbookSessionId) {
      api = api.header('workbook-session-id', workbookSessionId);
    }
    const fileInfo = await api.get();
    return fileInfo;
  }
}
