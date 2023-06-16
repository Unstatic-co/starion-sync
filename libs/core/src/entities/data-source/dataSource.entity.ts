import { Metadata } from '@lib/core/data-type';
import { BaseEntity } from '../baseEntity';
import { ProviderId, ProviderType } from './dataProvider.entity';

export type DataSourceId = string;

export interface DataSourceStatistics {
  rowsNumber: number;
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
  statistic: DataSourceStatistics;
  metadata: Metadata;

  createdAt: Date;
  updatedAt: Date;
}

export const defaultDataSourceStatistics: DataSourceStatistics = {
  rowsNumber: 0,
};
