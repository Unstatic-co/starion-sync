require('dotenv').config();

export const AppConfig = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 8080,
  apiKeys: process.env.API_KEYS || 'api-key',
};

export const RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || 'password',
  db: parseInt(process.env.REDIS_DB) || 0,
  tls: process.env.REDIS_TLS_ENABLED === 'true' || false,
};
