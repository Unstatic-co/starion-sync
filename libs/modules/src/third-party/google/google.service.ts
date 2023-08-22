import { ConfigName } from '@lib/core/config';
import { InjectTokens } from '@lib/modules/inject-tokens';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRefreshClient } from 'google-auth-library';

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);

  constructor(private readonly configService: ConfigService) {}

  async createAuthClient(refreshToken: string) {
    const client = new UserRefreshClient(
      this.configService.get<string>(`${ConfigName.GOOGLE}.clientId`),
      this.configService.get<string>(`${ConfigName.GOOGLE}.clientSecret`),
      refreshToken,
    );
    return client;
  }
}
