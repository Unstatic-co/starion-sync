import { registerAs } from '@nestjs/config';
import { ConfigName } from './config.enum';
import { DatabaseConfig, DatabaseType } from './database.config';

export interface DestinationDatabaseConfig {
  type: DatabaseType;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  uri?: string;
}

export const destinationDatabaseConfig: DatabaseConfig = {
  type: (process.env.DB_TYPE as DatabaseType) || DatabaseType.MONGODB,
  uri: process.env.DB_URI,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

export const destinationDatabaseConfigRegister = registerAs(
  ConfigName.DESTINATION_DATABASE,
  () => {
    return destinationDatabaseConfig;
  },
);
