import { registerAs } from '@nestjs/config';
import { ConfigName } from './config.enum';

export interface AppConfig {
  environment: string;
  port: number;
}

export const appConfigRegister = registerAs(ConfigName.APP, () => {
  return {
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
  } as AppConfig;
});
