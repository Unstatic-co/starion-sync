import { DataSource } from './dataSource';
import { ExcelDataSource } from './excel';
import { DelayedFormSync, FormSync } from './formsync';
import { GoogleSheetsDataSource } from './google-sheets';

const entities = [
  FormSync,
  DelayedFormSync,
  DataSource,
  ExcelDataSource,
  GoogleSheetsDataSource,
];

export {
  FormSync,
  DelayedFormSync,
  DataSource,
  ExcelDataSource,
  GoogleSheetsDataSource,
};
export default entities;
