import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { ITransactionManager } from '../classes';

@Injectable()
export class TransactionManager implements ITransactionManager {
  constructor(
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}

  public async createTransactionObject(): Promise<mongoose.ClientSession> {
    const session = await this.connection.startSession();
    return session;
  }

  public async runWithTransaction<T>(
    fn: (transaction: mongoose.ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.connection.startSession();
    let result;
    try {
      await session.withTransaction(async () => {
        result = await fn(session);
      });
    } finally {
      await session.endSession();
    }
    return result;
  }
}
