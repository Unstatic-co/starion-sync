import { InjectTokens } from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TestActivities {
  private readonly logger = new Logger(TestActivities.name);

  constructor(
    @Inject(InjectTokens.DATA_PROVIDER_REPOSITORY)
    private readonly dataProviderRepository,
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
