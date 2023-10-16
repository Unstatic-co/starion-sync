import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { DataSource } from '../dataSource';

export type GoogleSheetsMetadataJob = {
  jobId: string;
  cron: string;
};

@Entity()
export class GoogleSheetsDataSource {
  @PrimaryColumn()
  id: string;

  @Column({
    nullable: false,
  })
  spreadsheetId: string;

  @Column({
    nullable: false,
  })
  sheetId: string;

  @Column({
    nullable: false,
  })
  refreshToken: string;

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
  metadataJob: GoogleSheetsMetadataJob;

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
