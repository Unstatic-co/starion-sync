import { proxyActivities } from '@temporalio/workflow';
// Only import the activity types
import { IGreetingActivity } from '../activity';

const { greeting, reverseGreeting } = proxyActivities<IGreetingActivity>({
    startToCloseTimeout: '1 minute',
});

export async function example(name?: string): Promise<string> {
    if (!name) {
        name = 'Temporal';
    }
    return await greeting(name);
}