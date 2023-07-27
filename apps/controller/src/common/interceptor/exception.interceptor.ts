import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ExceptionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((exception) => {
        const hostType = context.getType();
        if (hostType === 'http') {
          if (exception instanceof HttpException) {
            return throwError(() => exception);
          } else {
            return throwError(() => new InternalServerErrorException());
          }
        }
      }),
    );
  }
}
