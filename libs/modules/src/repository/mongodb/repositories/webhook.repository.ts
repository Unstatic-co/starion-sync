import { Injectable } from '@nestjs/common';
import {
  CreateWebhookData,
  IWebhookRepository,
  UpdateWebhookData,
} from '../../classes/repositories';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Utils } from 'apps/configurator/src/common/utils';
import { QueryOptions } from '../../classes';
import mongoose from 'mongoose';
import { WebhookDocument, WebhookModel } from '../models';
import { WebhookStatus } from '@lib/core';

@Injectable()
export class WebhookRepository implements IWebhookRepository {
  constructor(
    @InjectConnection() private readonly connection: mongoose.Connection,
    @InjectModel(WebhookModel.name)
    private webhookModel: Model<WebhookDocument>,
  ) {}

  public async getById(id: string, options?: QueryOptions) {
    const conditions = {
      _id: Utils.toObjectId(id),
      isDeleted: false,
    };
    if (options?.includeDeleted) {
      Object.assign(conditions, { isDeleted: true });
    }
    let query = this.webhookModel.findOne(conditions);
    if (options?.session) {
      query = query.session(options.session);
    }
    const result = await query;
    if (!result) return null;
    return result.toJSON();
  }

  public async getActiveWebhooksByType(type: string, options?: QueryOptions) {
    const conditions = {
      type,
      status: WebhookStatus.ACTIVE,
      isDeleted: false,
    };
    if (options?.includeDeleted) {
      Object.assign(conditions, { isDeleted: true });
    }
    let query = this.webhookModel.find(conditions);
    if (options?.session) {
      query = query.session(options.session);
    }
    const result = await query;
    if (!result) return null;
    return result.map((result) => result.toJSON());
  }

  public async create(data: CreateWebhookData) {
    const doc = new this.webhookModel({
      ...data,
      status: WebhookStatus.ACTIVE,
    });
    const result = await doc.save();
    return result;
  }

  public async update(data: UpdateWebhookData, options?: QueryOptions) {
    let result;
    const session = await this.connection.startSession();
    await session.withTransaction(async () => {});
    if (options?.new) {
      return result;
    }
  }

  public async delete(id: string, options?: QueryOptions): Promise<void> {
    const session = options?.session
      ? options.session
      : await this.connection.startSession();

    const processFunc = async () => {
      const trigger = await this.webhookModel
        .findOne({
          _id: Utils.toObjectId(id),
          isDeleted: false,
        })
        .session(session);
      if (!trigger) {
        throw new Error('Trigger not found');
      }
      await trigger
        .updateOne({
          $set: {
            isDeleted: true,
          },
        })
        .session(session);
    };

    if (options?.session) {
      await processFunc();
    } else {
      await session.withTransaction(processFunc);
    }
  }
}
