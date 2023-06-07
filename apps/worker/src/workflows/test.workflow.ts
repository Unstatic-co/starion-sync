import { proxyActivities } from '@temporalio/workflow';
import { TestActivities } from '../activities';

const { testGreeting, testSaveDb } = proxyActivities<TestActivities>({
  startToCloseTimeout: '1 minute',
});

export async function TestWorkflow(): Promise<string> {
  const result = await testGreeting('Starion Sync');

  await testSaveDb();

  return result;
}
