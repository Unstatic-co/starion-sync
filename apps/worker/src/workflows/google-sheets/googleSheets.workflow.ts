import {
  continueAsNew,
  proxyActivities,
  setHandler,
  sleep,
  workflowInfo,
} from '@temporalio/workflow';
import { GoogleSheetsActivities } from '../../activities/google-sheets/googleSheet.activities';

const { greeting } = proxyActivities<GoogleSheetsActivities>({
  startToCloseTimeout: '1 minute',
});

export async function GoogleSheetsFullSyncWorkflow(): Promise<string> {
  const result = await greeting('GoogleSheetsFullSyncWorkflow');

  return result;
}
