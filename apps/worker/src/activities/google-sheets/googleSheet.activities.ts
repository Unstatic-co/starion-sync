import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleSheetsActivities {
  constructor() {}

  async greeting(name: string): Promise<string> {
    return `Hello, ${name}`;
  }
}
