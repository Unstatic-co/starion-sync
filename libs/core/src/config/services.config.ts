import { registerAs } from '@nestjs/config';
import { ConfigName } from './config.enum';

export interface ServicesConfig {
  cronTrigger: {
    url: string;
  };
}

export const appConfigRegister = registerAs(ConfigName.SERVICES, () => {
  return {
    cronTrigger: {
      url: process.env.CRON_TRIGGER_URL || 'http://localhost:9005',
    },
  } as ServicesConfig;
});
