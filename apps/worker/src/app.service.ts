import { Injectable, Logger } from '@nestjs/common';
import { CommonService } from './modules/common/common.service';

@Injectable()
/**
 * App Service
 */
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly commonService: CommonService) {}
  /**
   * Hello world
   * @return {string} Hello message
   */
  getHello(): string {
    return 'Hello World !';
  }

  async getConfig() {
    return this.commonService.findConfig();
  }

  async test() {
    throw new Error('demo loi');
  }
}
