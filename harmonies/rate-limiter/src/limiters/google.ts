import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redisClient } from '../client';

export const GoogleSheetLimiter = new RateLimiterRedis({
  // Basic options
  storeClient: redisClient,
  points: 300, // Number of points
  duration: 60, // Per second(s)

  // Custom
  blockDuration: 0, // Do not block if consumed more than points
  keyPrefix: 'ggsheet_global', // must be unique for limiters with different purpose
});

export const GoogleSheetPerUserLimiter = new RateLimiterRedis({
  // Basic options
  storeClient: redisClient,
  points: 30, // Number of points
  duration: 60, // Per second(s)

  // Custom
  blockDuration: 0, // Do not block if consumed more than points
  keyPrefix: 'ggsheet_user', // must be unique for limiters with different purpose
});
