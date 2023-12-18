import { FastifyReply, FastifyRequest } from 'fastify';
import { AppConfig } from '../config';

export async function apiKeyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Get the API key from the header
  const apiKey = request.headers['x-api-key'] as string;

  // Check if the key is present
  if (!apiKey) {
    reply.code(401).send({ error: 'Invalid API key' });
  }

  // Compare the keys
  if (AppConfig.apiKeys.indexOf(apiKey) === -1) {
    reply.code(403).send({ error: 'Invalid API key' });
  }

  return;
}
