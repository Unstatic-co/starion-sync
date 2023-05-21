import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { Config, ConfigSchema } from '../../schemas/Config.schema';
import { Counter, CounterSchema } from '../../schemas/Counter.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Config.name, schema: ConfigSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
  ],
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
