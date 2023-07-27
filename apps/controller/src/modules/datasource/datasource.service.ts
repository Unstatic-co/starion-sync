import { DataSource, LimitationValue } from '@lib/core';
import { IDataSourceRepository, InjectTokens } from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { UnacceptableActivityError } from '../../common/exception';

@Injectable()
export class DataSourceService {
  private readonly logger = new Logger(DataSourceService.name);

  constructor(
    @Inject(InjectTokens.DATA_SOURCE_REPOSITORY)
    private readonly dataSourceRepository: IDataSourceRepository,
  ) {}

  async checkLimitation(dataSource: DataSource) {
    this.logger.debug(`Checking limitation of ds ${dataSource.id}`);
    const { statistics, limits } = dataSource;
    Object.entries(limits).forEach(([key, value]) => {
      if (statistics[key] > (value as LimitationValue).hard) {
        throw new UnacceptableActivityError(
          `Ds ${dataSource.id} exceed limitation of ${key}`,
          { shouldWorkflowFail: false },
        );
      }
    });
  }
}
