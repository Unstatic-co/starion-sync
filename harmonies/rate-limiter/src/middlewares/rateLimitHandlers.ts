import { FastifyReply, FastifyRequest } from 'fastify';
import { GoogleSheetPerUserLimiter } from '../limiters/google';
import { consumeRateLimiter } from '../limiters';

export const GoogleSheetPerUserHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { userId } = request.params as Record<string, string>;
  const point = (request.body as Record<string, any>)?.point || 1;

  const isPermitted = await consumeRateLimiter(
    GoogleSheetPerUserLimiter,
    userId,
    point,
  );

  return reply.send({ ok: isPermitted });
};
