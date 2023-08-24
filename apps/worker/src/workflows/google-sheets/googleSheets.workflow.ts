import { proxyActivities } from '@temporalio/workflow';
import { GoogleSheetsActivities } from '../../activities/google-sheets/googleSheet.activities';

const { greeting } = proxyActivities<GoogleSheetsActivities>({
  startToCloseTimeout: '1 minute',
});

export async function googleSheetsFullSync(): Promise<string> {
  const result = await greeting('GoogleSheetsFullSyncWorkflow');

  return result;
}
