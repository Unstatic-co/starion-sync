import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleService } from './google.service';
import { GoogleSheetsService } from './googleSheets.service';

@Module({
  imports: [ConfigModule],
  providers: [GoogleService, GoogleSheetsService],
  exports: [GoogleService, GoogleSheetsService],
})
export class GoogleModule {}
