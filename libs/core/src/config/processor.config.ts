import { registerAs } from '@nestjs/config';
import { ConfigName } from './config.enum';

export interface ProcessorConfig {
  downloaderUrl: string;
  comparerUrl: string;
  loaderUrl: string;
}

export const processorConfig: ProcessorConfig = {
  downloaderUrl: process.env.DOWNLOADER_URL || 'http://localhost:9005',
  comparerUrl: process.env.COMPARER_URL || 'http://localhost:9006',
  loaderUrl: process.env.LOADER_URL || 'http://localhost:9007',
};

export const processorConfigRegister = registerAs(ConfigName.PROCESSOR, () => {
  return processorConfig;
});
