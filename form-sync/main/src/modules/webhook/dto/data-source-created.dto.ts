import { IsNotEmpty } from 'class-validator';
import { ProviderType } from 'src/lib/provider';

export type ExcelDataSourceConfig = {
  workbookId: string;
  worksheetId: string;
  auth: {
    refreshToken: string;
  };
  timezone: string;
};

export type GoogleSheetsDataSourceConfig = {
  spreadsheetId: string;
  sheetId: string;
  auth: {
    refreshToken: string;
  };
};

export type DataSourceConfig =
  | ExcelDataSourceConfig
  | GoogleSheetsDataSourceConfig
  | any;

export class DataSourceCreatedDto {
  @IsNotEmpty()
  dataProvider: ProviderType;

  @IsNotEmpty()
  dataSourceId: string;

  @IsNotEmpty()
  dataSourceConfig: DataSourceConfig;
}
