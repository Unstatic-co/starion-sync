import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants';

export class ApiError extends HttpException {
  code: string;

  constructor(code: string, message: any) {
    let statusCode: number;
    switch (code) {
      case ErrorCode.INVALID_DATA:
        statusCode = HttpStatus.BAD_REQUEST;
        break;
      case ErrorCode.NO_DATA_EXISTS:
        statusCode = HttpStatus.NOT_FOUND;
    }
    super(message, statusCode);
    this.code = code;
  }
}
