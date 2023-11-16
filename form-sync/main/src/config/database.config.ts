import { registerAs } from '@nestjs/config';
import { ConfigName } from '.';

export interface DatabaseConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  uri?: string;
  tlsEnabled?: boolean;

  metadataDbUri: string;
}

export const databaseConfig: DatabaseConfig = {
  uri: process.env.DB_URI,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  tlsEnabled: process.env.DB_TLS_ENABLED === 'true',
  metadataDbUri:
    process.env.METADATA_DB_URI ||
    'mongodb://admin:abc123456@localhost:27017/starion-form-sync?authSource=admin',
};

export const databaseConfigRegister = registerAs(ConfigName.DATABASE, () => {
  return databaseConfig;
});
