import { Injectable } from '@nestjs/common';
import { Activities, Activity } from 'nestjs-temporal';
import { ActivityInterface } from '@temporalio/activity';

@Injectable()
@Activities()
export class GreetingActivity {
  constructor() { }

  @Activity()
  async greeting(name: string): Promise<string> {
    return 'Hello ' + name;
  }
}

export interface IGreetingActivity extends ActivityInterface {
  greeting(name: string): Promise<string>;
}
