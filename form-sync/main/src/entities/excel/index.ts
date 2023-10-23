import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { DataSource } from '../dataSource';

export type ExcelMetadataJob = {
  jobId: string;
  cron: string;
};

@Entity()
export class ExcelDataSource {
  @PrimaryColumn()
  id: string;

  @Column({
    nullable: false,
  })
  workbookId: string;

  @Column({
    nullable: false,
  })
  worksheetId: string;

  @Column({
    nullable: false,
  })
  refreshToken: string;

  @Column({
    nullable: false,
  })
  timezone: string;

  @Column({
    nullable: true,
    type: 'int',
  })
  rowCount: number;

  @Column({
    nullable: true,
    type: 'int',
  })
  colCount: number;

  @Column({
    nullable: true,
    type: 'json',
  })
  headers: Record<string, number>;

  @Column({
    nullable: false,
    type: 'json',
  })
  metadataJob: ExcelMetadataJob;

  @Column({
    nullable: true,
    type: 'timestamp',
  })
  metadataSyncedAt: Date;

  @OneToOne(() => DataSource, {
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'id' })
  dataSource: DataSource;
}

export * from './metadata';
