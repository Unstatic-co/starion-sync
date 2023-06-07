import { DATA_PROVIDER_REPOSITORY } from '@lib/modules/repository';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TestActivities {
  private readonly logger = new Logger(TestActivities.name);

  constructor(
    @Inject(DATA_PROVIDER_REPOSITORY) private readonly dataProviderRepository,
  ) {}

  async testGreeting(name: string): Promise<string> {
    return `(Test) Hello, ${name}`;
  }

  async testSaveDb(): Promise<any> {
    return await this.dataProviderRepository.create({
      type: 'test',
      config: {},
      metadata: {},
    });
  }
}
