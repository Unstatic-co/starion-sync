import { ErrorCode } from './code';

export * from './code';

export class BaseError extends Error {}

export class ExternalError extends BaseError {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly data?: {
      [key: string]: any;
    },
  ) {
    super(message);
  }

  public setData(key: string, value: any) {
    this.data[key] = value;
  }
}

export class InternalError extends BaseError {
  constructor(public readonly code: ErrorCode, message: string) {
    super(message);
  }
}
