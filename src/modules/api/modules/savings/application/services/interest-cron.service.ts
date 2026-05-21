import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';
import { BudgetRepository } from '@/modules/api/modules/budgets/domain/repositories/budget.repository';
import { CategoryType } from '@/modules/api/modules/categories/domain/category';
import { CategoryRepository } from '@/modules/api/modules/categories/domain/repositories/category.repository';
import { FinancesRepository } from '@/modules/api/modules/finances/domain/repositories/finances.repository';
import { TransactionEntity } from '@/modules/api/modules/transactions/infrastructure/database/entities/transaction.entity';

import { GoalsRepository } from '../../domain/repositories/goals.repository';
import { PlannedSavingRepository } from '../../domain/repositories/planned.repository';
import { PlannedSavingStatus } from '../../domain/savings-planned';
import { SavingGoalEntity } from '../../infrastructure/database/entities/saving-goals.entity';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

@Injectable()
export class InterestCronService {
  private readonly context = InterestCronService.name;

  constructor(
    @Inject('GoalsRepository') private readonly goalsRepository: GoalsRepository,
    @Inject('PlannedSavingRepository')
    private readonly plannedSavingRepository: PlannedSavingRepository,
    @Inject('BudgetRepository') private readonly budgetRepository: BudgetRepository,
    @Inject('FinancesRepository') private readonly financesRepository: FinancesRepository,
    @Inject('CategoryRepository') private readonly categoryRepository: CategoryRepository,
    private readonly dataSource: DataSource,
    private readonly logger: LoggerProviderService,
  ) {}

  @Cron('0 10 * * *')
  async registerDailyInterest(): Promise<void> {
    this.logger.info(this.context, 'Iniciando registro automático de intereses diarios');

    const goals = await this.goalsRepository.findActiveWithInterest();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let registered = 0;
    let skipped = 0;

    for (const goal of goals) {
      try {
        const lastDate = goal.lastInterestDate ? new Date(goal.lastInterestDate) : null;
        if (lastDate) {
          lastDate.setHours(0, 0, 0, 0);
          if (lastDate >= today) {
            skipped++;
            continue;
          }
        }

        const annualRate = Number(goal.account?.interestRate ?? 0);
        if (annualRate <= 0) {
          skipped++;
          continue;
        }

        const completedSavings = await this.plannedSavingRepository.findByGoalId(goal.id!);
        const accumulatedAmount = completedSavings
          .filter((s) => s.status === PlannedSavingStatus.COMPLETED)
          .reduce((sum, s) => sum + Number(s.amount), 0);

        if (accumulatedAmount <= 0) {
          skipped++;
          continue;
        }

        const periodStart = goal.lastInterestDate ?? goal.createdAt ?? today;
        const days = Math.floor(
          (today.getTime() - new Date(periodStart).getTime()) / (1000 * 60 * 60 * 24),
        );

        if (days <= 0) {
          skipped++;
          continue;
        }

        const interestAmount = this.calculateInterest(accumulatedAmount, annualRate, days);
        if (interestAmount < 0.01) {
          skipped++;
          continue;
        }

        const finances = await this.financesRepository.findByUserId(goal.userId!);
        if (!finances?.id) {
          this.logger.warn(
            this.context,
            `Finances not found for user ${goal.userId}, skipping goal ${goal.id}`,
          );
          skipped++;
          continue;
        }

        const now = new Date();
        const budget = await this.budgetRepository.findByFinancesIdAndMonth(
          finances.id,
          MONTH_NAMES[now.getMonth()],
          now.getFullYear(),
        );
        if (!budget) {
          this.logger.warn(this.context, `No budget for current month, skipping goal ${goal.id}`);
          skipped++;
          continue;
        }

        const category = await this.categoryRepository.findByType(CategoryType.SAVINGS);
        if (!category) {
          this.logger.warn(this.context, `Savings category not found, skipping goal ${goal.id}`);
          skipped++;
          continue;
        }

        await this.dataSource.transaction(async (manager) => {
          await manager.save(TransactionEntity, {
            amount: Number(interestAmount.toFixed(2)),
            type: 'interest' as const,
            source: `Interés: ${goal.name}`,
            userId: goal.userId,
            budgetId: budget.id,
            categoryId: category.id,
            accountId: goal.accountId ?? undefined,
            toAccountId: goal.accountId ?? undefined,
            transactionDate: today,
            savingGoalId: goal.id,
          });

          await manager.update(SavingGoalEntity, { id: goal.id }, { lastInterestDate: today });
        });

        this.logger.info(
          this.context,
          `Interés registrado para meta ${goal.id}: ${interestAmount.toFixed(2)}`,
        );
        registered++;
      } catch (err) {
        this.logger.error(
          this.context,
          `Error al registrar interés para meta ${goal.id}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.info(
      this.context,
      `Registro de intereses completado — registrados: ${registered}, omitidos: ${skipped}`,
    );
  }

  private calculateInterest(accumulatedAmount: number, annualRate: number, days: number): number {
    return accumulatedAmount * (Math.pow(1 + annualRate / 100, days / 365) - 1);
  }
}
