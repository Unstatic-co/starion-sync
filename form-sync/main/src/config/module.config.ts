import { registerAs } from '@nestjs/config';
import { ConfigName } from '.';

export interface ModuleConfig {
  metadataUrl: string;
}

export const moduleConfigRegister = registerAs(ConfigName.MODULE, () => {
  return {
    metadataUrl: process.env.METADATA_HOST_URL || 'http://localhost:8000',
  } as ModuleConfig;
});
