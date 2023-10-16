import { registerAs } from '@nestjs/config';
import { ConfigName } from '.';

export interface MicrosoftConfig {
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

export const microsoftConfigRegister = registerAs(ConfigName.MICROSOFT, () => {
  return {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    scopes: process.env.MICROSOFT_PERMISSION_SCOPES?.split(',') || [
      'offline_access',
      'openid',
      'profile',
      'User.Read.All',
      'https://graph.microsoft.com/Files.ReadWrite.All',
      'Files.ReadWrite.All',
    ],
  } as MicrosoftConfig;
});
