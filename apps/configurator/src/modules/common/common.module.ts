import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { RepositoryModule } from '@lib/modules';

@Module({
  imports: [RepositoryModule.registerAsync()],
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
