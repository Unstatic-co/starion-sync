import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class CommonService {
  private readonly logger = new Logger(CommonService.name);
}
