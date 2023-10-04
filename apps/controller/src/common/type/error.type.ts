import { ErrorType } from '@lib/core';

export type ExternalErrorData = {
  type?: ErrorType;
  code: number;
  message: string;
  data?: any;
};
