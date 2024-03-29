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
import { Webhook, WebhookScope, WebhookStatus } from '@lib/core';

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
      delete conditions.isDeleted;
    }
    let query = this.webhookModel.findOne(conditions);
    if (options?.session) {
      query = query.session(options.session);
    }
    const result = await query;
    if (!result) return null;
    return result.toObject();
  }

  public async getActiveWebhooksByType(
    data: {
      type: string;
      scope?: string;
      dataSourceId?: string;
    },
    options?: QueryOptions,
  ) {
    const { type, scope, dataSourceId } = data;
    const conditions = {
      type,
      status: WebhookStatus.ACTIVE,
      isDeleted: false,
    };
    if (scope) {
      if (scope === WebhookScope.DATA_SOURCE) {
        Object.assign(conditions, { scope, dataSourceId });
      } else {
        Object.assign(conditions, { scope });
      }
    }
    if (options?.includeDeleted) {
      delete conditions.isDeleted;
    }
    let query = this.webhookModel.find(conditions);
    if (options?.session) {
      query = query.session(options.session);
    }
    const result = await query;
    if (!result) return null;
    return result.map((result) => result.toObject());
  }

  public async create(data: CreateWebhookData, options?: QueryOptions) {
    const webhook = new this.webhookModel({
      ...data,
      status: WebhookStatus.ACTIVE,
    });
    const query = options?.session
      ? webhook.save({ session: options.session })
      : webhook.save();
    await query;
    return webhook.toObject() as Webhook;
  }

  public async bulkCreate(data: CreateWebhookData[], options?: QueryOptions) {
    const webhooks = data.map(
      (webhookData) =>
        new this.webhookModel({
          ...webhookData,
          status: WebhookStatus.ACTIVE,
        }),
    );
    const query = options?.session
      ? this.webhookModel.bulkSave(webhooks, { session: options.session })
      : this.webhookModel.bulkSave(webhooks);
    await query;
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
