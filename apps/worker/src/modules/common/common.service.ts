import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Model, PipelineStage } from 'mongoose';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import * as _ from 'lodash';
import { Config, ConfigDocument } from '../../schemas/Config.schema';
import { Utils } from '../../common/utils';
import { TIME_WAIT_RETRY } from '../../common/constants';

@Injectable()
export class CommonService implements OnModuleInit {
  private readonly logger = new Logger(CommonService.name);

  constructor(
    @InjectConnection() private readonly connection: mongoose.Connection,
    @InjectModel(Config.name)
    private configModel: Model<ConfigDocument>,
  ) {}

  async onModuleInit() {
    await this.seedConfig();
  }

  async seedConfig() {
    if (!(await this.configModel.findOne({}))) {
      await this.configModel.create({});
    }
  }

  logQueryUpdate(promises: any[], results: any[]) {
    for (let index = 0; index < promises.length; index++) {
      const promise = promises[index];
      if (
        promise &&
        promise.op &&
        (promise.op === 'updateOne' || promise.op === 'updateMany')
      ) {
        if (
          results[index].matchedCount === 0 ||
          results[index].modifiedCount === 0
        ) {
          this.logger.warn(
            `logQueryUpdate(): ${promise.op} ${promise.model.modelName}`,
            promise._conditions,
          );
          this.logger.debug(promise._update);
          this.logger.debug(results[index]);
        }
      }
    }
  }

  async execQueriesWithLog(...queries) {
    const queryResults = await Promise.all(queries);
    this.logQueryUpdate(queries, [queryResults]);
  }

  public async executeWithRetry(
    func: () => Promise<any>,
    times: number,
    funcName?: string,
  ) {
    let retry = 1;
    let result;
    while (true) {
      try {
        result = await func();
        return result;
      } catch (error) {
        this.logger.warn(
          `${
            funcName ? funcName : 'executeWithRetry'
          }(): Retrying ${retry} time. ${error.message}`,
        );
        retry++;
        if (retry > times) {
          throw error;
        }
        await Utils.wait(TIME_WAIT_RETRY);
      }
    }
  }

  async findConfig() {
    return this.configModel.findOne({});
  }
}
