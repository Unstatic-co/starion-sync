import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteTriggerDto {
  @IsNotEmpty()
  @IsString()
  jobId: string;

  @IsNotEmpty()
  @IsString()
  cron: string;
}
