import { proxyActivities } from "@temporalio/workflow";
import { CommonActivities } from "../modules/activities/common.activities";

const { testWorkflow } =
    proxyActivities<CommonActivities>({
        startToCloseTimeout: '10 second',
    });

export async function testWf() {
    const result = await testWorkflow();
    return result;
}