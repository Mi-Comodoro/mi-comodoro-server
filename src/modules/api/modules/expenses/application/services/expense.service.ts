import { Inject, Injectable } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { PlannedExpense } from '../../domain/expenses';
import { PlannedExpenseRepository } from '../../domain/repositories/expense-planned.repository';
import { GetPlannedExpensesQueryDto } from '../../infrastructure/dto/expense.query.dto';

@Injectable()
export class ExpenseService {
  private readonly context = ExpenseService.name;
  constructor(
    @Inject('PlannedExpenseRepository')
    private readonly expensePlannedRepository: PlannedExpenseRepository,
    private readonly logger: LoggerProviderService,
  ) {}
  async addPlan(data: PlannedExpense) {
    this.logger.info(this.context, '');
    return await this.expensePlannedRepository.add(data);
  }

  async findAll(filters: GetPlannedExpensesQueryDto) {
    this.logger.info(this.context, '');
    return await this.expensePlannedRepository.findAll(filters);
  }
}
