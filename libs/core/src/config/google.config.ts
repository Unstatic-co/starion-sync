import { registerAs } from '@nestjs/config';
import { ConfigName } from './config.enum';

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

export const googleConfigRegister = registerAs(ConfigName.GOOGLE, () => {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    scopes: process.env.GOOGLE_PERMISSION_SCOPES?.split(',') || [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.metadata',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive',
    ],
  } as GoogleConfig;
});
