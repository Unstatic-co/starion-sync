import { registerAs } from '@nestjs/config';
import { ConfigName } from './config.enum';

export interface StorageConfig {
  s3Region: string;
  s3Url: string;
  s3AccessKey: string;
  s3SecretKey: string;
  s3DiffDataBucket: string;
}

export const storageConfigRegister = registerAs(ConfigName.STORAGE, () => {
  return {
    s3Region: process.env.S3_REGION || 'us-east-1',
    s3Url: process.env.S3_URL || 'http://localhost:9000',
    s3AccessKey: process.env.S3_ACCESS_KEY || 'admin',
    s3SecretKey: process.env.S3_SECRET_KEY || 'abc123456',
    s3DiffDataBucket: process.env.S3_DIFF_DATA_BUCKET || 'diff-data',
  } as StorageConfig;
});
