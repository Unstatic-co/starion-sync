export enum ConfigName {
  APP = 'app',
  DATABASE = 'database',
  BROKER = 'broker',
  ORCHESTRATOR = 'orchestrator',
  REDIS = 'redis',
  PROCESSOR = 'processor',
  MODULE = 'module',
  STARION_SYNC = 'starion-sync',
  MICROSOFT = 'microsoft',
  GOOGLE = 'google',
}

export * from './app.config';
export * from './broker.config';
export * from './database.config';
export * from './microsoft.config';
export * from './redis.config';
export * from './starionSync.config';
