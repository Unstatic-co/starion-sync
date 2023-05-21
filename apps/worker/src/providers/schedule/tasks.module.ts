import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CommonModule } from '../../modules/common/common.module';

@Module({
  imports: [MongooseModule.forFeature([]), CommonModule],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
