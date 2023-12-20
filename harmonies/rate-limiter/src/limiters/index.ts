import { RateLimiterAbstract } from 'rate-limiter-flexible';

export async function consumeRateLimiter(
  rateLimiter: RateLimiterAbstract,
  key: string,
  points: number,
): Promise<boolean> {
  try {
    await rateLimiter.consume(key, points);
    return true;
  } catch (rejRes) {
    if (rejRes instanceof Error) {
      throw rejRes;
    } else {
      return false;
    }
  }
}
