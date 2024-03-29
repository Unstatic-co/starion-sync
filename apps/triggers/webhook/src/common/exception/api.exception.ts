import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants';

export class ApiError extends HttpException {
  code: string;

  constructor(code: string | number, message: any, payload?: any) {
    let statusCode: number;
    if (typeof code === 'number') {
      statusCode = code;
    } else {
      switch (code) {
        case ErrorCode.INVALID_DATA:
          statusCode = HttpStatus.BAD_REQUEST;
          break;
        case ErrorCode.NO_DATA_EXISTS:
          statusCode = HttpStatus.NOT_FOUND;
          break;
        case ErrorCode.HEALTH_CHECK_FAILED:
          statusCode = HttpStatus.BAD_REQUEST;
          break;
        case ErrorCode.ALREADY_EXISTS:
          statusCode = HttpStatus.CONFLICT;
          break;
        default:
          statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
          break;
      }
    }
    super({ content: message, payload }, statusCode);
    this.code = code as string;
  }
}
