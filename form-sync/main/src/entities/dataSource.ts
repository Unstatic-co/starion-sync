import { ProviderType } from 'src/lib/provider';
import { DataSourceSchema } from 'src/lib/schema';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class DataSource {
  @PrimaryColumn()
  id: string;

  @Column({
    type: 'text',
  })
  provider: ProviderType;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  schema: DataSourceSchema;
}
