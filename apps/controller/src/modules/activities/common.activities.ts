import { Injectable } from '@nestjs/common';
import { CommonService } from '../common/common.service';

@Injectable()
export class CommonActivities {
  constructor(private readonly commonService: CommonService) {}
}
