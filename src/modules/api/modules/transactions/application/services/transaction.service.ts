import { Inject, Injectable } from '@nestjs/common';

import { TransactionRepository } from '../../domain/repositories/transaction.repository';
import { Transaction } from '../../domain/transaction';

@Injectable()
export class TransactionService {
  constructor(
    @Inject('TransactionRepository')
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async findByBudget(budgetId: string, type?: string): Promise<Transaction[]> {
    const validType = ['income', 'expense', 'savings'].includes(type as string)
      ? (type as Transaction['type'])
      : undefined;

    return await this.transactionRepository.findByBudget(budgetId, validType);
  }
}
