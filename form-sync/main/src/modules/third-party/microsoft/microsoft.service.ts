import {
  ConfidentialClientApplication,
  RefreshTokenRequest,
} from '@azure/msal-node';
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
import { GetFileInfoResponse, GetRangeResponse } from './microsoft.interface';
import { InjectTokens } from 'src/common/inject-tokens';
import { ConfigName } from 'src/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheRegistry } from 'src/common/cache';

@Injectable()
export class MicrosoftService {
  private readonly logger = new Logger(MicrosoftService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(InjectTokens.MICROSOFT_AUTH_CLIENT)
    private readonly microsoftAuthClient: ConfidentialClientApplication,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getAccessTokenWithCache(refreshToken: string, alias: string) {
    const cached = await this.cacheManager.get<string>(
      CacheRegistry.ExcelAccessToken.Key(alias),
    );
    if (!cached) {
      this.logger.debug(`getAccessTokenWithCache(): cache miss`);
      const accessToken = await this.getAccessToken(refreshToken);
      await this.cacheManager.set(
        CacheRegistry.ExcelAccessToken.Key(alias),
        accessToken,
        CacheRegistry.ExcelAccessToken.TTL,
      );
      return accessToken;
    }
    return cached;
  }

  async getAccessToken(refreshToken: string) {
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
    private readonly microsoftService: MicrosoftService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async createClientFromRefreshToken(refreshToken: string) {
    const accessToken = await this.microsoftService.getAccessToken(
      refreshToken,
    );
    return this.createClient(accessToken);
  }

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

  async getWorkbookSessionIdWithCache(
    data: {
      client: Client;
      workbookId: string;
      persist?: boolean;
    },
    alias: string,
  ) {
    const { workbookId } = data;
    let result = await this.cacheManager.get<string>(
      CacheRegistry.ExcelSessionId.Key(workbookId, alias),
    );
    if (!result) {
      this.logger.debug(`getWorkbookSessionIdWithCache(): cache miss`);
      result = await this.createWorkbookSession(data);
      await this.cacheManager.set(
        CacheRegistry.ExcelSessionId.Key(workbookId, alias),
        result,
        CacheRegistry.ExcelSessionId.TTL,
      );
    }
    return result;
  }

  async createWorkbookSession(data: {
    client: Client;
    workbookId: string;
    persist?: boolean;
  }) {
    const { client, workbookId, persist } = data;
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
    );
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

  async getWorksheetRow(data: {
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
    const url = `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range/usedRange/row(row=${row})`;
    if (select?.length) {
      url.concat(`?$select=${select.join(',')}`);
    }
    let api = await client.api(url);
    if (workbookSessionId) {
      api = api.header('workbook-session-id', workbookSessionId);
    }
    return api.get();
  }

  async getWorksheetRowValues(data: {
    client: Client;
    workbookId: string;
    worksheetId: string;
    row: number;
    workbookSessionId?: string;
    select?: string[];
  }): Promise<any[]> {
    return this.getWorksheetRow({ ...data, select: ['values'] }).then(
      (res) => res.values[0],
    );
  }

  async getWorksheetColumn(data: {
    client: Client;
    workbookId: string;
    worksheetId: string;
    col: number;
    workbookSessionId?: string;
    select?: string[];
  }): Promise<GetRangeResponse> {
    const { client, workbookId, workbookSessionId, col, worksheetId, select } =
      data;
    this.logger.debug(
      `getWorksheetColumn(): ${JSON.stringify({
        workbookId,
        worksheetId,
        col,
      })}`,
    );
    const url = `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range/usedRange/column(column=${col})`;
    if (select?.length) {
      url.concat(`?$select=${select.join(',')}`);
    }
    let api = await client.api(url);
    if (workbookSessionId) {
      api = api.header('workbook-session-id', workbookSessionId);
    }
    return api.get();
  }

  async getWorksheetColumnValues(data: {
    client: Client;
    workbookId: string;
    worksheetId: string;
    col: number;
    workbookSessionId?: string;
    select?: string[];
  }): Promise<any[]> {
    return this.getWorksheetColumn({ ...data, select: ['values'] }).then(
      (res) => res.values.map((v) => v[0]),
    );
  }

  async getWorksheetCell(data: {
    client: Client;
    workbookId: string;
    worksheetId: string;
    row: number;
    col: number;
    workbookSessionId?: string;
    select?: string[];
  }): Promise<GetRangeResponse> {
    const {
      client,
      workbookId,
      workbookSessionId,
      col,
      row,
      worksheetId,
      select,
    } = data;
    this.logger.debug(
      `getWorksheetCell(): ${JSON.stringify({
        workbookId,
        worksheetId,
        col,
        row,
      })}`,
    );
    const url = `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/cell(row=${row},column=${col})`;
    if (select?.length) {
      url.concat(`?$select=${select.join(',')}`);
    }
    let api = await client.api(url);
    if (workbookSessionId) {
      api = api.header('workbook-session-id', workbookSessionId);
    }
    return api.get();
  }

  async getWorksheetCellValue(data: {
    client: Client;
    workbookId: string;
    worksheetId: string;
    row: number;
    col: number;
    workbookSessionId?: string;
    select?: string[];
  }): Promise<any> {
    return this.getWorksheetCell({ ...data, select: ['values'] }).then(
      (res) => res.values[0][0],
    );
  }

  async getWorksheetUsedRange(data: {
    client: Client;
    workbookId: string;
    worksheetId: string;
    workbookSessionId?: string;
    select?: string[];
  }): Promise<GetRangeResponse> {
    const { client, workbookId, workbookSessionId, worksheetId, select } = data;
    this.logger.debug(
      `getWorksheetUsedRange(): ${JSON.stringify({
        workbookId,
        worksheetId,
      })}`,
    );
    const url = `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range/usedRange`;
    if (select?.length) {
      url.concat(`?$select=${select.join(',')}`);
    }
    let api = await client.api(url);
    if (workbookSessionId) {
      api = api.header('workbook-session-id', workbookSessionId);
    }
    return api.get();
  }

  async insertWorksheetRange(data: {
    client: Client;
    workbookId: string;
    worksheetId: string;
    workbookSessionId?: string;
    rangeAddress: string;
    select?: string[];
  }): Promise<GetRangeResponse> {
    const {
      client,
      workbookId,
      workbookSessionId,
      worksheetId,
      rangeAddress,
      select,
    } = data;
    this.logger.debug(
      `insertWorksheetRange(): ${JSON.stringify({
        workbookId,
        worksheetId,
      })}`,
    );
    const url = `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${rangeAddress}')/insert`;
    if (select?.length) {
      url.concat(`?$select=${select.join(',')}`);
    }
    let api = client.api(url);
    if (workbookSessionId) {
      api = api.header('workbook-session-id', workbookSessionId);
    }
    return api.post({
      shift: 'Down',
    });
  }

  async updateWorksheetRange(data: {
    client: Client;
    workbookId: string;
    worksheetId: string;
    workbookSessionId?: string;
    rangeAddress: string;
    values: any[][];
    select?: string[];
  }): Promise<GetRangeResponse> {
    const {
      client,
      workbookId,
      workbookSessionId,
      worksheetId,
      rangeAddress,
      select,
    } = data;
    this.logger.debug(
      `updateWorksheetRange(): ${JSON.stringify({
        workbookId,
        worksheetId,
      })}`,
    );
    const url = `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${rangeAddress}')`;
    if (select?.length) {
      url.concat(`?$select=${select.join(',')}`);
    }
    let api = await client.api(url);
    if (workbookSessionId) {
      api = api.header('workbook-session-id', workbookSessionId);
    }
    return api.patch({
      values: data.values,
    });
  }

  async deleteWorksheetRange(data: {
    client: Client;
    workbookId: string;
    worksheetId: string;
    workbookSessionId?: string;
    rangeAddress: string;
  }): Promise<GetRangeResponse> {
    const { client, workbookId, workbookSessionId, worksheetId, rangeAddress } =
      data;
    this.logger.debug(
      `deleteWorksheetRange(): ${JSON.stringify({
        workbookId,
        worksheetId,
      })}`,
    );
    const url = `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${rangeAddress}')/delete`;
    let api = client.api(url);
    if (workbookSessionId) {
      api = api.header('workbook-session-id', workbookSessionId);
    }
    return api.post({
      shift: 'Up',
    });
  }

  async closeWorkbookSession(
    client: Client,
    workbookId: string,
    workbookSessionId: string,
  ) {
    this.logger.debug(`closeWorkbookSession(): workbookId = ${workbookId}`);
    await client
      .api(`/me/drive/items/${workbookId}/workbook/closeSession`)
      .header('workbook-session-id', workbookSessionId)
      .post({});
    this.logger.debug(
      `closeWorkbookSession(): closed session, workbookId = ${workbookId}`,
    );
  }

  async refreshWorkbookSession(
    client: Client,
    workbookId: string,
    workbookSessionId: string,
  ) {
    this.logger.debug(`refreshWorkbookSession(): workbookId = ${workbookId}`);
    await client
      .api(`/me/drive/items/${workbookId}/workbook/refreshSession`)
      .header('workbook-session-id', workbookSessionId)
      .post({});
    this.logger.debug(
      `refreshWorkbookSession(): refreshed session, workbookId = ${workbookId}`,
    );
  }
}
