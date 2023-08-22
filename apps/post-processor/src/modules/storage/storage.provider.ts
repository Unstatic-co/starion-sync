import { ConfigModule, ConfigService } from '@nestjs/config';
import { InjectTokens } from '../../common/inject-tokens';
import { S3Client } from '@aws-sdk/client-s3';
import { ConfigName, StorageConfig } from '@lib/core/config';

export const StorageProvider = {
  provide: InjectTokens.STORAGE_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const storageConfig = configService.get<StorageConfig>(ConfigName.STORAGE);
    const { s3AccessKey, s3SecretKey, s3Region, s3Url } = storageConfig;
    const storageClient = new S3Client({
      endpoint: s3Url,
      region: s3Region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: s3AccessKey,
        secretAccessKey: s3SecretKey,
      },
    });
    return storageClient;
  },
  imports: [ConfigModule],
};
