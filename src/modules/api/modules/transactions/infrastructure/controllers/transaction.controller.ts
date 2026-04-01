import { Controller, Get, Param, Query } from '@nestjs/common';

import { TransactionService } from '../../application/services/transaction.service';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get('budget/:budgetId')
  async findByBudget(@Param('budgetId') budgetId: string, @Query('type') type?: string) {
    return this.transactionService.findByBudget(budgetId, type);
  }
}
