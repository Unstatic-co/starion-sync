import { registerAs } from '@nestjs/config';
import { ConfigName } from './config.enum';

export interface RedisConfig {
  host: string;
  port: string | number;
  password?: string;
  tls?: boolean;
}

export const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS_ENABLED === 'true',
};

export const redisConfigRegister = registerAs(ConfigName.REDIS, () => {
  return redisConfig;
});
