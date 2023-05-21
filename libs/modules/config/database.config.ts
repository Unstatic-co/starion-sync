import { registerAs } from '@nestjs/config';
import { ConfigName } from './config.enum';

export enum DatabaseType {
  MONGODB = 'mongodb',
  MYSQL = 'mysql',
  POSTGRES = 'postgres',
  MARIADB = 'mariadb',
  SQLITE = 'sqlite',
  MSSQL = 'mssql',
}

export interface DatabaseConfig {
  type: DatabaseType;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  uri?: string;
}

export const databaseConfig: DatabaseConfig = {
  type: (process.env.DB_TYPE as DatabaseType) || DatabaseType.MONGODB,
  uri: process.env.DB_URI,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

export const databaseConfigRegister = registerAs(ConfigName.DATABASE, () => {
  return databaseConfig;
});
