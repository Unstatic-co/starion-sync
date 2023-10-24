export const EXCEL_PRIMARY_ID_NAME = '__StarionId';
export const EXCEL_HASHED_PRIMARY_ID = 'f_gfbbfabeggejigfgbfhdcdbecifcjhdd';
export const GOOGLE_SHEETS_PRIMARY_ID_NAME = '__StarionId';
export const GOOGLE_SHEETS_HASHED_PRIMARY_ID =
  'f_gfbbfabeggejigfgbfhdcdbecifcjhdd';

export type RecordId = string;
export type FieldId = string;

export enum NativeDataType {
  String = 'String',
  Number = 'Number',
  Boolean = 'Boolean',
  Date = 'Date',
  List = 'List',
  Object = 'Object',
}

export type SchemaField = {
  id: string;
  name: string;
  type: NativeDataType;
  originalType: string;
  nullable: boolean;
  enum: any[];
  readonly: boolean;
  primary: boolean;
};

export type DataSourceSchema = Record<FieldId, SchemaField>;
