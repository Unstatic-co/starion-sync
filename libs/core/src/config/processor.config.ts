import { registerAs } from '@nestjs/config';
import { ConfigName } from './config.enum';

export interface ProcessorConfig {
  downloaderUrl: string;
  comparerUrl: string;
  loaderUrl: string;
}

export const processorConfig: ProcessorConfig = {
  downloaderUrl: process.env.DOWLOADER_URL || 'http://localhost:9005',
  comparerUrl: process.env.COMPARER_URL || 'http://localhost:9006',
  loaderUrl: process.env.LOADER_URL || 'http://localhost:9007',
};

export const orchestratorConfigRegister = registerAs(
  ConfigName.PROCESSOR,
  () => {
    return processorConfig;
  },
);
