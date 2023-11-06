import { ErrorCode } from './code';

export * from './code';

export enum ErrorType {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
}

export class BaseError extends Error {}

export class ExternalError extends BaseError {
  constructor(
    public readonly code: ErrorCode,
    public readonly message: string,
    public readonly data?: {
      [key: string]: any;
    },
  ) {
    super(message);
  }

  public setData(key: string, value: any) {
    this.data[key] = value;
  }

  public toJSON() {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    };
  }
}

export class InternalError extends BaseError {
  constructor(
    public readonly code: ErrorCode,
    public readonly message: string,
    public readonly data?: {
      [key: string]: any;
    },
  ) {
    super(message);
  }

  public setData(key: string, value: any) {
    this.data[key] = value;
  }

  public toJSON() {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    };
  }
}

export class InternalProcessorError extends InternalError {
  constructor(
    public readonly code: ErrorCode,
    public readonly message: string,
    public readonly data?: {
      [key: string]: any;
    },
  ) {
    super(code, message, data);
  }
}
