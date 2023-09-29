import { ErrorType } from '@lib/core';

export type ProcessorApiErrorResponse = {
  type?: ErrorType;
  code: number;
  message: string;
  data?: any;
};

export type ProcessorErrorData = {
  type?: ErrorType;
  code: number;
  message: string;
  data?: any;
};
