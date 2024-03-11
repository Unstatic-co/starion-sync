import { registerAs } from '@nestjs/config';
import { ConfigName } from './config.enum';
import { DatabaseType } from './database.config';

export interface DestinationDatabaseConfig {
  type: DatabaseType;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  uri?: string;
  schema?: string; // for postgres
}

export const destinationDatabaseConfig: DestinationDatabaseConfig = {
  type: (process.env.DEST_DB_TYPE as DatabaseType) || DatabaseType.POSTGRES,
  uri: process.env.DEST_DB_URI,
  host: process.env.DEST_DB_HOST || 'postgresql',
  port: parseInt(process.env.DEST_DB_PORT) || 5432,
  user: process.env.DEST_DB_USER || 'admin',
  password: process.env.DEST_DB_PASSWORD || 'abc123456',
  database: process.env.DEST_DB_NAME || 'starion-sync',
  schema: process.env.DEST_DB_SCHEMA || 'public',
};

export const destinationDatabaseConfigRegister = registerAs(
  ConfigName.DESTINATION_DATABASE,
  () => {
    return destinationDatabaseConfig;
  },
);
