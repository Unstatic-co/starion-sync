import {
  Catch,
  ArgumentsHost,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import { ApiError } from './api.exception';
import { ErrorType, ExternalError } from '@lib/core/error';

@Catch()
export class AllExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    this.logger.debug(`Error ${request.method} ${request.originalUrl}`);
    this.logger.debug(exception.stack);

    if (exception instanceof ApiError) {
      const status = exception.getStatus() || HttpStatus.INTERNAL_SERVER_ERROR;
      response.status(status).json({
        type: ErrorType.INTERNAL,
        code: exception.code,
        message: exception.getResponse(),
        statusCode: status,
      });
    } else if (exception instanceof ExternalError) {
      const status = HttpStatus.INTERNAL_SERVER_ERROR;
      response.status(status).json({
        type: ErrorType.EXTERNAL,
        code: exception.code,
        message: exception.message,
        statusCode: status,
        data: exception.data,
      });
    } else {
      super.catch(exception, host);
    }
  }
}
