import { Injectable, Logger } from '@nestjs/common';

@Injectable()
/**
 * App Service
 */
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor() {}
  /**
   * Hello world
   * @return {string} Hello message
   */
  getHello(): string {
    return 'Hello World !';
  }

  async test() {
    throw new Error('demo loi');
  }
}
