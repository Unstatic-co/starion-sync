import Fastify, { FastifyInstance } from 'fastify';
import { AppConfig } from './config';
import { GoogleSheetPerUserHandler } from './middlewares/rateLimitHandlers';

const fastify: FastifyInstance = Fastify({
  logger: true,
});

// ping route
fastify.get('/ping', async () => {
  return { pong: 'it worked!' };
});

fastify.get('/', (request, reply) => {
  reply.send({ hello: 'world' });
});

fastify.post('/google-sheets/:userId', GoogleSheetPerUserHandler);

fastify.listen({ port: AppConfig.port }, (err) => {
  if (err) throw err;
});
