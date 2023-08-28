import { ConfigName } from '@lib/core/config';
import { registerAs } from '@nestjs/config';

export interface WebhookConfig {
  baseUrl: string;
}

export const webhookConfig: WebhookConfig = {
  baseUrl: process.env.WEBHOOK_TRIGGER_BASE_URL,
};

export const webhookConfigRegister = registerAs('webhook', () => {
  return webhookConfig;
});
