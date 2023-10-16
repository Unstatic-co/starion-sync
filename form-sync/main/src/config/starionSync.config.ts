import { registerAs } from '@nestjs/config';
import { ConfigName } from '.';

export interface StarionSyncConfig {
  baseUrl: string;
  webhookPublicKey: string;
  apiKey: string;
}

export const starionSyncConfig: StarionSyncConfig = {
  webhookPublicKey:
    process.env.WEBHOOK_PUBLIC_KEY?.split(String.raw`\n`).join('\n') || '',
  baseUrl: process.env.STARION_SYNC_BASE_URL || 'http://localhost:9000',
  apiKey: process.env.STARION_SYNC_API_KEY || '',
};

export const starionSyncConfigRegister = registerAs(
  ConfigName.STARION_SYNC,
  () => {
    return starionSyncConfig;
  },
);
