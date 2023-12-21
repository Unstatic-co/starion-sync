import { GaxiosError, GetUserInfoResponse } from './google.type';
import { ConfigName } from '@lib/core/config';
import { ERROR_CODE, ExternalError } from '@lib/core/error';
import { InjectTokens } from '@lib/modules/inject-tokens';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRefreshClient } from 'google-auth-library';
import { intersection } from 'lodash';
import { GetAccessTokenResponse } from 'google-auth-library/build/src/auth/oauth2client';
import { handleGoogleAuthError } from './error-handler';

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);

  constructor(private readonly configService: ConfigService) {}

  createAuthClient(refreshToken: string) {
    const clientId = this.configService.get<string>(
      `${ConfigName.GOOGLE}.clientId`,
    );
    const clientSecret = this.configService.get<string>(
      `${ConfigName.GOOGLE}.clientSecret`,
    );
    const client = new UserRefreshClient(clientId, clientSecret, refreshToken);

    return client;
  }

  async getAccessToken(refreshToken: string) {
    try {
      const client = this.createAuthClient(refreshToken);
      const token = await client.getAccessToken();
      const requiredScopes = this.configService.get<string[]>(
        `${ConfigName.GOOGLE}.scopes`,
      );
      const scopes = token.res.data.scope.split(' ');
      if (
        intersection(scopes, requiredScopes).length !== requiredScopes.length
      ) {
        throw new ExternalError(
          ERROR_CODE.TOKEN_MISSING_PERMISSIONS,
          "Token doesn't have enough required permissions",
        );
      }
      return token.token;
    } catch (error) {
      handleGoogleAuthError(error);
    }
  }

  async validateToken(refreshToken: string) {
    const client = this.createAuthClient(refreshToken);
    let token: GetAccessTokenResponse;
    try {
      token = await client.getAccessToken();
    } catch (error) {
      handleGoogleAuthError(error);
    }
    const requiredScopes = this.configService.get<string[]>(
      `${ConfigName.GOOGLE}.scopes`,
    );
    const scopes = token.res.data.scope.split(' ');
    if (intersection(scopes, requiredScopes).length !== requiredScopes.length) {
      throw new ExternalError(
        ERROR_CODE.TOKEN_MISSING_PERMISSIONS,
        "Token doesn't have enough required permissions",
      );
    }
  }

  async getUserInfo(refreshToken: string) {
    try {
      const client = this.createAuthClient(refreshToken);
      const res = await client.request({
        url: 'https://www.googleapis.com/oauth2/v2/userinfo',
      });
      return res.data as GetUserInfoResponse;
    } catch (error) {
      handleGoogleAuthError(error);
    }
  }
}
