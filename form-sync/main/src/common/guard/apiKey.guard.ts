import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { ConfigName } from 'src/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKeyHeader = request.headers['x-api-key'];

    if (!apiKeyHeader) {
      return false;
    }

    const apiKeys = this.configService.get<string[]>(
      `${ConfigName.APP}.apiKeys`,
    );

    if (apiKeys.includes(apiKeyHeader)) {
      return true;
    }

    return false;
  }
}
