import { GoogleSheetsDiscoverer } from './google-sheets';
import { MicrosoftExcelDiscoverer } from './microsoft-excel/microsoftExcel.discover';

export const DiscovererProviders = [
  GoogleSheetsDiscoverer,
  MicrosoftExcelDiscoverer,
];
