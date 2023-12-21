import { RedisConfig } from './config';

const Redis = require('ioredis');

export const redisClient = new Redis({
  enableOfflineQueue: false,
  host: RedisConfig.host,
  user: 'default',
  password: RedisConfig.password,
  // tls: RedisConfig.tls ? { rejectUnauthorized: false } : false,
  tls: RedisConfig.tls ? {} : false,
  db: RedisConfig.db,
});

redisClient.on('error', (err) => {
  console.error('Redis error: ', err);
});
