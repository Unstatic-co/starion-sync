import { registerAs } from '@nestjs/config';
import { ConfigName } from './config.enum';

export interface AppConfig {
  environment: string;
  name: string;
  port: number;
  isSwaggerShowed: boolean;
  swaggerUser: string;
  swaggerPassword: string;
  logLevel: string;
  logLokiHost: string;
}

export const appConfigRegister = registerAs(ConfigName.APP, () => {
  return {
    environment: process.env.NODE_ENV || 'development',
    name: process.env.APP_NAME || 'App',
    port: process.env.PORT || 3000,
    isSwaggerShowed: process.env.IS_SWAGGER_SHOWED === 'true',
    swaggerUser: process.env.SWAGGER_USER || 'admin',
    swaggerPassword: process.env.SWAGGER_PASSWORD || 'admin',
    logLevel: process.env.LOG_LEVEL || 'debug',
    logLokiHost: process.env.LOG_LOKI_HOST || 'http://localhost:3100',
  } as AppConfig;
});
