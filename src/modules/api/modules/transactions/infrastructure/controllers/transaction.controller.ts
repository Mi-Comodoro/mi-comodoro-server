import { Controller, Get, Param, Query } from '@nestjs/common';

import { TransactionService } from '../../application/services/transaction.service';
import { TransactionFilters } from '../../domain/transaction';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  // transaction.controller.ts
  @Get('budget/:budgetId')
  async findByBudget(
    @Param('budgetId') budgetId: string,
    @Query('type') type?: 'income' | 'expense' | 'savings' | undefined,
    @Query('categoryId') categoryId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const query: TransactionFilters = {
      type,
      categoryId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: Number(page),
      limit: Number(limit),
    };
    const { data, pagination } = await this.transactionService.findByBudget(budgetId, query);
    return { transactions: data, pagination };
  }
}
