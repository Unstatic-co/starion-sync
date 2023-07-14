import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MicrosoftExcelActivities {
  constructor(private readonly configService: ConfigService) {}

  async greeting(name: string): Promise<string> {
    return `Hello, ${name}`;
  }
}
