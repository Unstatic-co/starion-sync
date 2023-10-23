import { GoogleSheetsSyncflowController } from './google-sheets';
import { MicrosoftExcelSyncflowController } from './microsoft-excel';

export const SyncflowControllerProviders = [
  MicrosoftExcelSyncflowController,
  GoogleSheetsSyncflowController,
];
