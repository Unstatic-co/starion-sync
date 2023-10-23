/* eslint-disable @typescript-eslint/ban-types */
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  Logger,
  ValidationError,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ApiError } from '../exception/api.exception';
import 'reflect-metadata';
import { ErrorCode } from '../constants';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  private readonly validationLogger = new Logger('ValidationLog');

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    this.validationLogger.debug('Data', JSON.stringify(value));
    const object = plainToClass(metatype, value);
    const errors = await validate(object);
    if (errors.length > 0) {
      const messages = this.getErrorMessages(errors);
      throw new ApiError(ErrorCode.INVALID_DATA, messages);
    }
    return object;
  }

  private getErrorMessages(errors: ValidationError[]) {
    let messages = [];
    for (let index = 0; index < errors.length; index++) {
      const error = errors[index];
      if (error.constraints) {
        for (const [, value] of Object.entries(error.constraints)) {
          messages.push(value);
        }
      } else if (error.children) {
        const childMessages = this.getErrorMessages(error.children);
        messages = [...messages, ...childMessages];
      }
    }
    return messages;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
