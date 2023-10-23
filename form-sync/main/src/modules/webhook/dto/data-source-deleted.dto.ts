import { IsNotEmpty, IsOptional } from 'class-validator';

export class DataSourceDeletedDto {
  @IsNotEmpty()
  dataSourceId: string;

  @IsOptional()
  syncConnectionId: string;
}
