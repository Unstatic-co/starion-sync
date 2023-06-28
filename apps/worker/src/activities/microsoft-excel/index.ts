import { Injectable } from '@nestjs/common';

@Injectable()
export class MicrosoftExcelActivities {
  constructor() {}

  async greeting(name: string): Promise<string> {
    return `Hello, ${name}`;
  }
}
