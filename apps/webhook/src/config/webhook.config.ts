import { ConfigName } from '@lib/core/config';
import { registerAs } from '@nestjs/config';

export interface WebhookConfig {
  privateKey: string;
}

export const webhookConfig: WebhookConfig = {
  privateKey:
    process.env.WEBHOOK_PRIVATE_KEY?.split(String.raw`\n`).join('\n') ||
    undefined,
};

export const webhookConfigRegister = registerAs(ConfigName.WEBHOOK, () => {
  return webhookConfig;
});
