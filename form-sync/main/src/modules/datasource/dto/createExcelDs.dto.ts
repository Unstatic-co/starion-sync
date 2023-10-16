import { IsNotEmpty, IsString } from 'class-validator';

export class CreateExcelDataSourceDto {
  @IsNotEmpty()
  @IsString()
  dataSourceId: string;

  @IsNotEmpty()
  @IsString()
  refreshToken: string;

  @IsNotEmpty()
  @IsString()
  workbookId: string;

  @IsNotEmpty()
  @IsString()
  worksheetId: string;

  @IsNotEmpty()
  @IsString()
  timezone: string;
}
