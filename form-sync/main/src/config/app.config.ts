import { registerAs } from '@nestjs/config';
import { ConfigName } from '.';

export interface AppConfig {
  environment: string;
  port: number;
  logLevel: string;
  apiKeys: string[];
}

export const appConfigRegister = registerAs(ConfigName.APP, () => {
  return {
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    logLevel: process.env.LOG_LEVEL || 'debug',
    apiKeys: process.env.API_KEYS?.split(',') || ['api-key'],
  } as AppConfig;
});
