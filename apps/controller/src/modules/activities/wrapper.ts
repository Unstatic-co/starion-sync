import { ApplicationFailure } from '@temporalio/common';
import {
  AcceptableActivityError,
  AcceptableActivityErrorData,
  UnacceptableActivityError,
} from '../../common/exception';

export async function activityWrapper<T>(
  fn: () => Promise<T>,
): Promise<T | AcceptableActivityErrorData> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AcceptableActivityError) {
      return error.data;
    } else if (error instanceof UnacceptableActivityError) {
      if (error.data.shouldActivityRetry === true) {
        throw ApplicationFailure.fromError(error, {
          nonRetryable: false,
          message: error.message,
          details: [{ shouldWorkflowFail: error.data.shouldWorkflowFail }],
        });
      } else {
        throw ApplicationFailure.fromError(error, {
          nonRetryable: true,
          message: error.message,
          details: [{ shouldWorkflowFail: error.data.shouldWorkflowFail }],
        });
      }
    } else {
      throw error;
    }
  }
}
