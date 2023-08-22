import { registerAs } from '@nestjs/config';
import { ConfigName } from './config.enum';

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
}

export const googleConfigRegister = registerAs(ConfigName.GOOGLE, () => {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  } as GoogleConfig;
});
