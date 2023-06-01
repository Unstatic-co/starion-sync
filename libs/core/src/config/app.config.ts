import { registerAs } from '@nestjs/config';
import { ConfigName } from './config.enum';

export interface AppConfig {
  environment: string;
  port: number;
  isSwaggerShowed: boolean;
  swaggerUser: string;
  swaggerPassword: string;
}

export const appConfigRegister = registerAs(ConfigName.APP, () => {
  return {
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    isSwaggerShowed: process.env.IS_SWAGGER_SHOWED === 'true',
    swaggerUser: process.env.SWAGGER_USER || 'admin',
    swaggerPassword: process.env.SWAGGER_PASSWORD || 'admin',
  } as AppConfig;
});
