import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HttpLog');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req: Request = context.switchToHttp().getRequest();

    this.logger.debug(
      `${req.user ? `[${req.user['_id']}]` : ''}[${req.ip}] ${req.method} ${
        req.originalUrl
      }`,
    );
    if (req.query && Object.keys(req.query).length > 0) {
      this.logger.debug('Query', req.query);
    }

    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        this.logger.debug(
          `${req.user ? `[${req.user['_id']}]` : ''}[${req.ip}] ${req.method} ${
            req.originalUrl
          } ${Date.now() - now}ms`,
        );
      }),
    );
  }
}
