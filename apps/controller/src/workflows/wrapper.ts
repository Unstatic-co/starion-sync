export async function workflowWrapper<T>(
  fn: () => Promise<T>,
): Promise<T | { errorThatShouldNotFailWf: boolean }> {
  try {
    return await fn();
  } catch (error) {
    const errorDefail = error.cause?.details?.[0];
    if (errorDefail?.shouldWorkflowFail === false) {
      return { errorThatShouldNotFailWf: true };
    } else {
      throw error;
    }
  }
}
