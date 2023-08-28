import { PipeTransform, Injectable } from '@nestjs/common';
import { ErrorCode } from '../constants';
import { ApiError } from '../exception/api.exception';
import { Types } from 'mongoose';

@Injectable()
export class ObjectIdPipe implements PipeTransform<string, Types.ObjectId> {
  public transform(value: string): Types.ObjectId {
    try {
      const transformedObjectId: Types.ObjectId = new Types.ObjectId(value);
      return transformedObjectId;
    } catch (error) {
      throw new ApiError(
        ErrorCode.INVALID_DATA,
        `Validation failed (ObjectId is expected)`,
      );
    }
  }
}
