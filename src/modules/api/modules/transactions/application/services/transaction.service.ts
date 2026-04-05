import { Inject, Injectable } from '@nestjs/common';

import { TransactionRepository } from '../../domain/repositories/transaction.repository';
import { Transaction, TransactionFilters } from '../../domain/transaction';

@Injectable()
export class TransactionService {
  constructor(
    @Inject('TransactionRepository')
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async findByBudget(
    budgetId: string,
    query: {
      type?: string;
      categoryId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    data: Transaction[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const filters: TransactionFilters = {
      type: ['income', 'expense', 'savings'].includes(query?.type as string)
        ? (query?.type as TransactionFilters['type'])
        : undefined,
      categoryId: query?.categoryId || undefined,
      dateFrom: query?.dateFrom || undefined,
      dateTo: query?.dateTo || undefined,
      page: query?.page ? Number(query.page) : 1,
      limit: query?.limit ? Number(query.limit) : 20,
    };

    return await this.transactionRepository.findByBudget(budgetId, filters);
  }
}
