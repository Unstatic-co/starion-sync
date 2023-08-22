import { InjectTokens } from '@lib/modules/inject-tokens';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sheets } from '@googleapis/sheets';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);

  constructor(private readonly configService: ConfigService) {}

  async getSpreadSheets(
    client: OAuth2Client,
    spreadSheetId: string,
  ): Promise<any> {
    const s = sheets({ version: 'v4', auth: client });
    const res = await s.spreadsheets.get({
      spreadsheetId: spreadSheetId,
    });
    return res;
  }
}
