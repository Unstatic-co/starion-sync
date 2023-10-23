import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { DataSourceModule } from '../datasource/dataSource.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'src/entities';

@Module({
  imports: [TypeOrmModule.forFeature([DataSource]), DataSourceModule],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
