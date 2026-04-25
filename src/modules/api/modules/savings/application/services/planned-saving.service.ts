import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { AccountRepository } from '../../../accounts/domain/repositories/account.respository';
import { BudgetRepository } from '../../../budgets/domain/repositories/budget.repository';
import { CategoryType } from '../../../categories/domain/category';
import { CategoryRepository } from '../../../categories/domain/repositories/category.repository';
import { TransactionRepository } from '../../../transactions/domain/repositories/transaction.repository';
import { Transaction } from '../../../transactions/domain/transaction';
import { GoalHistoryRepository } from '../../domain/repositories/goal-history.repository';
import { GoalsRepository } from '../../domain/repositories/goals.repository';
import { PlannedSavingRepository } from '../../domain/repositories/planned.repository';
import { GoalStatus } from '../../domain/savings-goals';
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
    @Inject('GoalHistoryRepository')
    private readonly goalHistoryRepository: GoalHistoryRepository,
    @Inject('AccountRepository')
    private readonly accountRepository: AccountRepository,
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
      completedAt: new Date(),
    });
    const transaction = await this.initSavingTransaction(savingPlanned);

    // Si la meta está en SCHEDULED, cambiar a IN_PROGRESS
    if (savingPlanned.savingGoalId) {
      const goal = await this.goalsRepository.findById(savingPlanned.savingGoalId);
      if (goal && goal.status === GoalStatus.SCHEDULED) {
        await this.goalsRepository.update(savingPlanned.savingGoalId, goal.userId as string, {
          status: GoalStatus.IN_PROGRESS,
        });
        // Registrar en historial de la meta
        await this.goalHistoryRepository.add({
          goalId: savingPlanned.savingGoalId,
          userId: goal.userId as string,
          field: 'status',
          oldValue: GoalStatus.SCHEDULED,
          newValue: GoalStatus.IN_PROGRESS,
        });
      }
    }

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

    // 4. Buscar la cuenta principal del usuario (de donde sale el dinero)
    const primaryAccount = await this.accountRepository.findPrimaryByUserId(
      budget.ownerId as string,
    );

    // 5. Crear transaction
    const transaction = await this.transactionRepository.save({
      amount: planned.amount,
      type: 'savings',
      source: meta?.name ?? 'Ahorro',
      userId: budget.ownerId,
      budgetId: planned.budgetId,
      categoryId: category.id,
      accountId: planned.accountId,
      fromAccountId: primaryAccount?.id, // De donde sale (cuenta principal)
      toAccountId: planned.accountId, // A donde llega (cuenta de la meta)
      transactionDate: new Date(),
    });

    return transaction;
  }
}
