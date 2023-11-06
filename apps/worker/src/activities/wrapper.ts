import { ApplicationFailure } from '@temporalio/common';
import {
  AcceptableActivityError,
  AcceptableActivityErrorData,
  UnacceptableActivityError,
  UnacceptableActivityErrorData,
} from '../common/exception';
import {
  ErrorType,
  ExternalError,
  InternalError,
  InternalProcessorError,
} from '@lib/core';
import { ProcessorApiErrorResponse, ProcessorErrorData } from '../common/type';

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

export async function processorWrapper<T>(
  processorName: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ExternalError) {
      const errorData = {
        type: ErrorType.EXTERNAL,
        ...err.toJSON(),
      } as ProcessorErrorData;
      throw new UnacceptableActivityError(
        `Error (external) when executing ${processorName}: ${errorData.message}`,
        {
          shouldActivityRetry: false,
          shouldWorkflowFail: true,
          errorData,
        },
      );
    } else if (err instanceof InternalError) {
      const errorData = {
        type: ErrorType.INTERNAL,
        ...err.toJSON(),
      } as ProcessorErrorData;
      throw new UnacceptableActivityError(
        `Error (internal) when executing ${processorName}: ${errorData.message}`,
        {
          shouldActivityRetry: false,
          shouldWorkflowFail: true,
          errorData,
        },
      );
    } else {
      throw new UnacceptableActivityError(
        `Error when executing ${processorName}: ${err.message}`,
        {
          shouldActivityRetry: true,
        },
      );
    }
  }
}

export async function processorApiWrapper<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err.response?.data?.type === ErrorType.EXTERNAL) {
      const errDetail = err.response.data as ProcessorApiErrorResponse;
      throw new ExternalError(errDetail.code, errDetail.msg, errDetail.data);
    } else if (err.response?.data?.type === ErrorType.INTERNAL) {
      const errDetail = err.response.data as ProcessorApiErrorResponse;
      throw new InternalProcessorError(
        errDetail.code,
        errDetail.msg,
        errDetail.data,
      );
    } else {
      throw err;
    }
  }
}
