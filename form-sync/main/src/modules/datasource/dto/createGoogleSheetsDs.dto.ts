import { IsNotEmpty, IsString } from 'class-validator';

export class CreateGoogleSheetsDataSourceDto {
  @IsNotEmpty()
  @IsString()
  dataSourceId: string;

  @IsNotEmpty()
  @IsString()
  refreshToken: string;

  @IsNotEmpty()
  @IsString()
  spreadsheetId: string;

  @IsNotEmpty()
  @IsString()
  sheetId: string;
}
