import { UnacceptableActivityErrorData } from '../common/exception';

export async function workflowWrapper<T>(
  fn: () => Promise<T>,
): Promise<T | { errorThatShouldNotFailWf: boolean }> {
  try {
    return await fn();
  } catch (error) {
    const errorDefail = getActivityErrorDetail(error);
    if (errorDefail?.shouldWorkflowFail === false) {
      return { errorThatShouldNotFailWf: true };
    } else {
      throw error;
    }
  }
}

export function getActivityErrorDetail(
  error: any,
): UnacceptableActivityErrorData {
  return error.cause?.details?.[0] as UnacceptableActivityErrorData;
}
