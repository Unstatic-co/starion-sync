import { ApplicationFailure } from '@temporalio/common';
import {
  AcceptableActivityError,
  AcceptableActivityErrorData,
  UnacceptableActivityError,
  UnacceptableActivityErrorData,
} from '../../common/exception';
import { ErrorType, ExternalError } from '@lib/core';
import { ExternalErrorData } from '../../common/type/error.type';

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
          details: [
            {
              shouldWorkflowFail: error.data.shouldWorkflowFail,
              errorData: error.data.errorData,
            } as Partial<UnacceptableActivityErrorData>,
          ],
        });
      } else {
        throw ApplicationFailure.fromError(error, {
          nonRetryable: true,
          message: error.message,
          details: [
            {
              shouldWorkflowFail: error.data.shouldWorkflowFail,
              errorData: error.data.errorData,
            } as Partial<UnacceptableActivityErrorData>,
          ],
        });
      }
    } else {
      throw error;
    }
  }
}

export async function externalActivityWrapper<T>(
  fn: () => Promise<T>,
  activityName?: string,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    activityName = activityName || 'external operation';
    if (err instanceof ExternalError) {
      const errorData = {
        type: ErrorType.EXTERNAL,
        ...err.toJSON(),
      } as ExternalErrorData;
      throw new UnacceptableActivityError(
        `Error when executing ${activityName}: ${errorData.message}`,
        {
          shouldActivityRetry: false,
          errorData,
        },
      );
    } else {
      throw new UnacceptableActivityError(
        `Error when executing ${activityName}: ${err.message}`,
        {
          shouldActivityRetry: true,
        },
      );
    }
  }
}
