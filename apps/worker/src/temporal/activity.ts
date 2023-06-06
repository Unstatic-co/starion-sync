import { Injectable } from '@nestjs/common';
import { ActivityInterface } from '@temporalio/activity';

@Injectable()
export class GreetingActivity {
  constructor() {}

  async greeting(name: string): Promise<string> {
    return 'Hello ' + name;
  }
}

export interface IGreetingActivity extends ActivityInterface {
  greeting(name: string): Promise<string>;
}
