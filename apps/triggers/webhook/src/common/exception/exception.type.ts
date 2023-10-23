import { HttpException } from '@nestjs/common';
import { ErrorCode } from '../constants';
export class NotEnoughNftError extends HttpException {
  constructor(message: string) {
    super(
      {
        code: ErrorCode.NO_DATA_EXISTS,
        message,
      },
      404,
    );
  }
}
