import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redisClient } from '../client';

export const MicrosoftGraphLimiter = new RateLimiterRedis({
  // Basic options
  storeClient: redisClient,
  points: 1500, // Number of points
  duration: 1, // Per second(s)

  // Custom
  blockDuration: 0, // Do not block if consumed more than points
  keyPrefix: 'microsoft_global', // must be unique for limiters with different purpose
});
