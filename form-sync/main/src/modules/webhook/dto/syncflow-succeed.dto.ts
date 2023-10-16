import { IsNotEmpty } from 'class-validator';

export class SyncflowSucceedDto {
  @IsNotEmpty()
  dataSourceId: string;

  @IsNotEmpty()
  syncflowId: string;

  @IsNotEmpty()
  syncVersion: number;

  @IsNotEmpty()
  statistics: {
    addedRowsCount: number;
    deletedRowsCount: number;
    isSchemaChanged: boolean;
  };
}
