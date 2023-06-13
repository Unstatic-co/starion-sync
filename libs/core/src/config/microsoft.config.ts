import { registerAs } from '@nestjs/config';
import { ConfigName } from './config.enum';

export interface MicrosoftConfig {
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

export const microsoftConfigRegister = registerAs(ConfigName.MICROSOFT, () => {
  return {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    scopes: process.env.MICROSOFT_PERMISSION_SCOPES.split(','),
  } as MicrosoftConfig;
});
