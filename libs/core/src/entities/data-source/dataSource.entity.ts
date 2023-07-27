import { Metadata } from '@lib/core/data-type';
import { BaseEntity } from '../baseEntity';
import { ProviderId, ProviderType } from './dataProvider.entity';
import { DataSourceConfig } from './dataSourceConfig.interface';

export type DataSourceId = string;

export interface DataSourceStatistics {
  rowsNumber: number;
  storageUsage: number;
}

export type LimitationValue = {
  soft: number;
  hard: number;
};

export interface DataSourceLimitation {
  rowsNumber: LimitationValue;
  storageUsage: LimitationValue;
}
export class DataSource extends BaseEntity {
  id: DataSourceId;
  externalId: string;
  externalLocalId: string;
  name?: string;
  provider: {
    id: ProviderId;
    type: ProviderType;
  };
  config: DataSourceConfig;
  statistics: DataSourceStatistics;
  limits: DataSourceLimitation;
  metadata: Metadata;

  createdAt: Date;
  updatedAt: Date;
}

export const defaultDataSourceStatistics: DataSourceStatistics = {
  rowsNumber: 0,
  storageUsage: 0,
};

export const defaultDataSourceLimitation: DataSourceLimitation = {
  rowsNumber: {
    soft: 5000,
    hard: 10000,
  },
  storageUsage: {
    soft: 2147483648, // 2gb
    hard: 4294967296, // 4gb
  },
};
