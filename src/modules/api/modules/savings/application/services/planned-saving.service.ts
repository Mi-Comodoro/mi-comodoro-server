import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { BudgetRepository } from '../../../budgets/domain/repositories/budget.repository';
import { CategoryType } from '../../../categories/domain/category';
import { CategoryRepository } from '../../../categories/domain/repositories/category.repository';
import { TransactionRepository } from '../../../transactions/domain/repositories/transaction.repository';
import { Transaction } from '../../../transactions/domain/transaction';
import { GoalsRepository } from '../../domain/repositories/goals.repository';
import { PlannedSavingRepository } from '../../domain/repositories/planned.repository';
import { PlannedSaving, PlannedSavingStatus } from '../../domain/savings-planned';

@Injectable()
export class PlannedSavingService {
  constructor(
    @Inject('PlannedSavingRepository')
    private readonly plannedSavingRepository: PlannedSavingRepository,
    @Inject('TransactionRepository')
    private readonly transactionRepository: TransactionRepository,
    @Inject('CategoryRepository')
    private readonly categoryRepository: CategoryRepository,
    @Inject('BudgetRepository') private readonly budgetRepository: BudgetRepository,
    @Inject('GoalsRepository') private readonly goalsRepository: GoalsRepository,
  ) {}

  async findByBudget(budgetId: string): Promise<PlannedSaving[]> {
    return await this.plannedSavingRepository.findByBudget(budgetId);
  }

  async markAsDone(id: string): Promise<{
    savingPlanned: PlannedSaving;
    transaction: Transaction;
  }> {
    const savingPlanned = await this.plannedSavingRepository.findById(id);
    if (!savingPlanned) {
      throw new NotFoundException('Planned Savings not fond');
    }
    if (savingPlanned.status === 'completed') {
      throw new BadRequestException('Este ahorro ya fue ejecutado');
    }

    const updated = await this.plannedSavingRepository.update(id, {
      status: PlannedSavingStatus.COMPLETED,
    });
    const transaction = await this.initSavingTransaction(savingPlanned);
    return { savingPlanned: updated!, transaction };
  }

  private async initSavingTransaction(planned: PlannedSaving): Promise<Transaction> {
    const budgetId = planned.budgetId as string;

    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    // 2. Buscar categoría de savings
    const category = await this.categoryRepository.findByType(CategoryType.SAVINGS);
    if (!category) {
      throw new NotFoundException('Categoría de ahorro no encontrada');
    }

    // 3. Buscar la meta para obtener el nombre como source
    const meta = await this.goalsRepository.findById(planned.savingGoalId);

    // 4. Crear transaction
    const transaction = await this.transactionRepository.save({
      amount: planned.amount,
      type: 'savings',
      source: meta?.name ?? 'Ahorro',
      userId: budget.ownerId,
      budgetId: planned.budgetId,
      categoryId: category.id,
      accountId: planned.accountId,
      transactionDate: new Date(),
    });

    return transaction;
  }
}
