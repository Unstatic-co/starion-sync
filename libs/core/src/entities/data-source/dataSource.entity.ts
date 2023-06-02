import { BaseEntity } from '../baseEntity';
import { ProviderId, ProviderType } from './dataProvider.entity';

export type DataSourceId = string;

export class DataSource extends BaseEntity {
  id: DataSourceId;
  name: string;
  provider: {
    id: ProviderId;
    type: ProviderType;
  };
  rowNumber: number;
  metadata: object;

  createdAt: Date;
  updatedAt: Date;
}
