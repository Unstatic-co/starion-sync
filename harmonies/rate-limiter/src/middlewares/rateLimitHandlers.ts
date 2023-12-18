import { FastifyReply, FastifyRequest } from 'fastify';
import {
  GoogleSheetLimiter,
  GoogleSheetPerUserLimiter,
} from '../limiters/google';
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

  if (isPermitted) reply.status(200).send();
  else reply.status(429).send();
};

export const GoogleSheetGlobalHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const point = (request.body as Record<string, any>)?.point || 1;

  const isPermitted = await consumeRateLimiter(
    GoogleSheetLimiter,
    'starion',
    point,
  );

  if (isPermitted) reply.status(200).send();
  else reply.status(429).send();
};
