import { Injectable } from '@nestjs/common';

@Injectable()
export class CommonActivities {
  constructor() {}

  async greeting(name: string): Promise<string> {
    return `Hello, ${name}`;
  }
}
