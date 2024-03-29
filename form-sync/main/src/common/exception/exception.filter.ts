import {
  Catch,
  ArgumentsHost,
  Logger,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import { ApiError } from './api.exception';

@Catch()
export class AllExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    this.logger.debug(`Error ${request.method} ${request.originalUrl}`);
    this.logger.debug(exception.stack);

    if (exception instanceof ApiError) {
      const status = exception.getStatus();
      response.status(status).json({
        code: exception.code,
        message: exception.getResponse(),
        statusCode: status,
      });
    } else {
      super.catch(exception, host);
    }
  }
}
