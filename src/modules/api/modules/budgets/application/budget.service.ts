import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';
import { GoalsRepository } from '@/modules/api/modules/savings/domain/repositories/goals.repository';
import { PlannedSavingRepository } from '@/modules/api/modules/savings/domain/repositories/planned.repository';
import { PlannedSavingStatus } from '@/modules/api/modules/savings/domain/savings-planned';

import { PlannedExpenseStatus } from '../../expenses/domain/expenses';
import { PlannedExpenseRepository } from '../../expenses/domain/repositories/expense-planned.repository';
import { FinancesRepository } from '../../finances/domain/repositories/finances.repository';
import { PlannedIncomeRepository } from '../../incomes/domain/repositories/incomes-planned.repository';
import { SavingAllocationRepository } from '../../savings/domain/repositories/allocation.repository';
import { Budget, BudgetStatus } from '../domain/budget';
import {
  BudgetHistoricalSummary,
  BudgetRepository,
} from '../domain/repositories/budget.repository';
import { CloseBudgetDto } from '../infrastructure/dto/close-budget.dto';

type CreateBudgetInput = {
  userId: string;
  month: string | number;
  year: string | number;
  mode: 'empty' | 'clone';
  sourceBudgetId?: string;
  name?: string;
};

@Injectable()
export class BudgetService {
  private readonly context: string = BudgetService.name;
  private readonly monthNames = [
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

  constructor(
    private readonly logger: LoggerProviderService,
    @Inject('BudgetRepository') private readonly budgetRepository: BudgetRepository,
    @Inject('FinancesRepository') private readonly financesRepository: FinancesRepository,
    @Inject('PlannedIncomeRepository')
    private readonly plannedIncomeRepository: PlannedIncomeRepository,
    @Inject('SavingAllocationRepository')
    private readonly allocationRepository: SavingAllocationRepository,
    @Inject('PlannedExpenseRepository')
    private readonly plannedExpenseRepository: PlannedExpenseRepository,
    @Inject('GoalsRepository') private readonly goalsRepository: GoalsRepository,
    @Inject('PlannedSavingRepository')
    private readonly plannedSavingRepository: PlannedSavingRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async createMonthlyBudget(input: CreateBudgetInput): Promise<Budget> {
    const currentDate = new Date();
    const month = this.resolveMonth(String(input.month), currentDate);
    const year = this.resolveYear(input.year, currentDate);
    const finances = await this.financesRepository.findByUserId(input.userId);

    if (!finances?.id) {
      throw new NotFoundException('Finances not found for user');
    }

    const duplicate = await this.budgetRepository.findByFinancesIdAndMonth(
      finances.id,
      month,
      year,
    );
    if (duplicate) {
      throw new ConflictException('Budget already exists for the selected month and year');
    }

    const sourceBudget =
      input.mode === 'clone'
        ? await this.resolveSourceBudget(finances.id, month, year, input.sourceBudgetId)
        : null;

    const budgetToCreate = sourceBudget
      ? this.buildBudgetFromSource(sourceBudget, input.userId, finances.id, month, year, input.name)
      : this.buildEmptyBudget(input.userId, finances.id, month, year, input.name);

    const createdBudget = await this.budgetRepository.save(budgetToCreate);

    if (sourceBudget) {
      await this.cloneMonthlyConfiguration(
        sourceBudget.id as string,
        createdBudget.id as string,
        month,
        year,
      );
    }

    return createdBudget;
  }

  async getCurrentBudgetByFinancesId(
    financesId: string,
    month?: string,
    year?: string | number,
  ): Promise<Budget | null> {
    const currentDate = new Date();
    const resolvedMonth = this.resolveMonth(month, currentDate);
    const resolvedYear = this.resolveYear(year, currentDate);

    this.logger.info(
      this.context,
      `Getting current budget for financesId: ${financesId}, month: ${resolvedMonth}, year: ${resolvedYear}`,
    );

    return await this.budgetRepository.findByFinancesIdAndMonth(
      financesId,
      resolvedMonth,
      resolvedYear,
    );
  }

  async getAllBudgetsByFinancesId(financesId: string, year?: number): Promise<Budget[]> {
    this.logger.info(
      this.context,
      `Getting all budgets for financesId: ${financesId}${year ? `, year: ${year}` : ''}`,
    );
    return await this.budgetRepository.findAllByFinancesId(financesId, year);
  }

  async getAllBudgetsByUserId(userId: string, year?: number): Promise<Budget[]> {
    this.logger.info(
      this.context,
      `Getting all budgets for userId: ${userId}${year ? `, year: ${year}` : ''}`,
    );

    const finances = await this.financesRepository.findByUserId(userId);
    if (!finances?.id) {
      throw new NotFoundException('Finances not found for user');
    }

    return await this.budgetRepository.findAllByFinancesId(finances.id, year);
  }

  async getHistoricalSummary(
    userId: string,
    year?: number,
  ): Promise<
    Array<
      BudgetHistoricalSummary & {
        status: BudgetStatus;
        savingsRate: number;
      }
    >
  > {
    const resolvedYear = year ?? new Date().getFullYear();

    this.logger.info(
      this.context,
      `Getting historical summary for userId: ${userId}, year: ${resolvedYear}`,
    );

    const finances = await this.financesRepository.findByUserId(userId);
    if (!finances?.id) {
      throw new NotFoundException('Finances not found for user');
    }

    const summary = await this.budgetRepository.findHistoricalSummaryByFinancesId(
      finances.id,
      resolvedYear,
    );

    return summary.map((item) => ({
      ...item,
      status: item.status as BudgetStatus,
      savingsRate:
        item.receivedIncome > 0
          ? Number(((item.totalSavings / item.receivedIncome) * 100).toFixed(2))
          : 0,
    }));
  }
  async getBudgetById(budgetId: string): Promise<Budget> {
    this.logger.info(this.context, `Getting budget by ID: ${budgetId}`);
    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget) {
      throw new NotFoundException(`Budget with ID: ${budgetId} not found`);
    }
    return budget;
  }

  async active(budgetId: string) {
    this.logger.info(this.context, `Getting budget by ID: ${budgetId}`);
    const budget = (await this.budgetRepository.findById(budgetId)) as Required<Budget>;
    if (!budget) {
      throw new NotFoundException(`Budget with ID: ${budgetId} not found`);
    }

    return await this.budgetRepository.active(budget.id);
  }
  async close(budgetId: string, dto: CloseBudgetDto = {}): Promise<Budget> {
    this.logger.info(this.context, `Closing budget by ID: ${budgetId}`);
    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget) {
      throw new NotFoundException(`Budget with ID: ${budgetId} not found`);
    }

    const surplus = await this.calculateSurplus(budgetId);

    // No surplus or no action requested: close directly without extra steps
    if (surplus <= 0 || !dto.surplusAction || dto.surplusAction === 'ignore') {
      const closed = await this.budgetRepository.close(budgetId);
      return closed!;
    }

    // Surplus with action: use QueryRunner for atomicity so the budget stays active on failure
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (dto.surplusAction === 'transfer_to_goal' && dto.targetGoalId) {
        await this.transferSurplusToGoal(budgetId, dto.targetGoalId, surplus, budget.ownerId);
      }

      const updates: Record<string, unknown> = { status: 'CLOSED' };
      if (dto.surplusAction === 'carry_forward') {
        updates['carry_forward_amount'] = surplus;
      }

      await queryRunner.manager
        .createQueryBuilder()
        .update('budgets')
        .set(updates)
        .where('id = :id', { id: budgetId })
        .execute();

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(this.context, `Error closing budget ${budgetId}: ${JSON.stringify(err)}`);
      throw err;
    } finally {
      await queryRunner.release();
    }

    return (await this.budgetRepository.findById(budgetId))!;
  }

  private async calculateSurplus(budgetId: string): Promise<number> {
    const rows = await this.dataSource.query<{ type: string; total: string }[]>(
      `SELECT type, COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE budget_id = $1 AND nulled_at IS NULL
       GROUP BY type`,
      [budgetId],
    );

    const sum = (type: string) => Number(rows.find((r) => r.type === type)?.total ?? 0);

    return sum('income') - sum('savings') - sum('expense');
  }

  private async transferSurplusToGoal(
    budgetId: string,
    goalId: string,
    amount: number,
    userId: string,
  ): Promise<void> {
    this.logger.info(
      this.context,
      `Transfiriendo excedente de $${amount} a meta ${goalId} para usuario ${userId}`,
    );
    const goal = await this.goalsRepository.findById(goalId);
    if (!goal) {
      throw new NotFoundException(`Goal with ID: ${goalId} not found`);
    }

    await this.plannedSavingRepository.save({
      savingGoalId: goalId,
      accountId: goal.accountId,
      budgetId,
      amount,
      date: new Date(),
      status: PlannedSavingStatus.COMPLETED,
      completedAt: new Date(),
    });
  }
  private async resolveSourceBudget(
    financesId: string,
    month: string,
    year: number,
    sourceBudgetId?: string,
  ): Promise<Budget | null> {
    if (sourceBudgetId) {
      const sourceBudget = await this.budgetRepository.findById(sourceBudgetId);

      if (!sourceBudget) {
        return null;
      }

      if (sourceBudget.financesId !== financesId) {
        throw new BadRequestException(
          'Source budget does not belong to the authenticated finances',
        );
      }

      return sourceBudget;
    }

    return await this.budgetRepository.findPreviousByFinancesId(financesId, month, year);
  }

  private buildEmptyBudget(
    userId: string,
    financesId: string,
    month: string,
    year: number,
    name?: string,
  ): Partial<Budget> {
    return {
      name: this.resolveBudgetName(month, year, name),
      month,
      year,
      isShared: false,
      needsLimit: 50,
      wantsLimit: 30,
      savingsLimit: 20,
      financesId,
      ownerId: userId,
      strategy: 'BALANCED',
      frequency: 'monthly',
      status: 'PLANNED',
    };
  }

  private buildBudgetFromSource(
    sourceBudget: Budget,
    userId: string,
    financesId: string,
    month: string,
    year: number,
    name?: string,
  ): Partial<Budget> {
    return {
      name: this.resolveBudgetName(month, year, name),
      month,
      year,
      isShared: sourceBudget.isShared,
      needsLimit: sourceBudget.needsLimit,
      wantsLimit: sourceBudget.wantsLimit,
      savingsLimit: sourceBudget.savingsLimit,
      financesId,
      ownerId: userId,
      partnerId: sourceBudget.partnerId,
      updatedBy: sourceBudget.updatedBy,
      strategy: sourceBudget.strategy,
      frequency: sourceBudget.frequency,
      status: 'PLANNED',
    };
  }

  private async cloneMonthlyConfiguration(
    sourceBudgetId: string,
    targetBudgetId: string,
    targetMonth: string,
    targetYear: number,
  ) {
    await this.clonePlannedIncomes(sourceBudgetId, targetBudgetId, targetMonth, targetYear);
    await this.cloneSavingAllocations(sourceBudgetId, targetBudgetId);
    await this.clonePlannedExpenses(sourceBudgetId, targetBudgetId, targetMonth, targetYear);
  }

  private async clonePlannedIncomes(
    sourceBudgetId: string,
    targetBudgetId: string,
    targetMonth: string,
    targetYear: number,
  ) {
    const plannedIncomes = await this.plannedIncomeRepository.findByBudgetId(sourceBudgetId);

    for (const income of plannedIncomes) {
      await this.plannedIncomeRepository.create({
        budgetId: targetBudgetId,
        incomeSourceId: income.incomeSourceId || undefined,
        source: income.source,
        amount: income.amount,
        date: this.adjustDateToTargetMonth(income.date as Date, targetMonth, targetYear),
        status: 'PENDING',
      });
    }
  }

  private async cloneSavingAllocations(sourceBudgetId: string, targetBudgetId: string) {
    const allocations = await this.allocationRepository.find(sourceBudgetId);

    for (const allocation of allocations) {
      await this.allocationRepository.create({
        goalId: allocation.goalId,
        percentage: Number(allocation.percentage),
        budgetId: targetBudgetId,
      });
    }
  }

  private async clonePlannedExpenses(
    sourceBudgetId: string,
    targetBudgetId: string,
    targetMonth: string,
    targetYear: number,
  ) {
    const plannedExpenses = await this.plannedExpenseRepository.findByBudget(sourceBudgetId);

    for (const expense of plannedExpenses) {
      await this.plannedExpenseRepository.add({
        budgetId: targetBudgetId,
        categoryId: expense.categoryId,
        name: expense.name,
        expectedAmount: expense.expectedAmount,
        dueDate: this.adjustDateToTargetMonth(expense.dueDate, targetMonth, targetYear),
        status: PlannedExpenseStatus.PLANNED,
        isEssential: expense.isEssential,
        notes: expense.notes,
        billsId: expense.billsId,
      });
    }
  }

  private adjustDateToTargetMonth(date: Date, targetMonth: string, targetYear: number): Date {
    const sourceDate = new Date(date);
    const targetMonthIndex = this.monthNames.findIndex(
      (item) => item.toLowerCase() === targetMonth.toLowerCase(),
    );

    if (targetMonthIndex === -1) {
      throw new BadRequestException('Invalid month value');
    }

    const maxDay = new Date(targetYear, targetMonthIndex + 1, 0).getDate();
    const targetDay = Math.min(sourceDate.getDate(), maxDay);

    return new Date(targetYear, targetMonthIndex, targetDay);
  }

  private resolveBudgetName(month: string, year: number, customName?: string): string {
    const trimmed = customName?.trim();
    if (trimmed) {
      return trimmed;
    }

    return `Presupuesto_${month}_de_${year}`;
  }

  private resolveMonth(month: string | undefined, currentDate: Date): string {
    if (!month) {
      return currentDate
        .toLocaleString('es-ES', { month: 'long' })
        .replace(/^./, (str) => str.toUpperCase());
    }

    const trimmedMonth = month.trim();
    const monthAsNumber = Number(trimmedMonth);

    if (!Number.isNaN(monthAsNumber)) {
      if (monthAsNumber < 1 || monthAsNumber > 12) {
        throw new BadRequestException('Month must be between 1 and 12');
      }

      return this.monthNames[monthAsNumber - 1];
    }

    const normalizedMonth = trimmedMonth.toLowerCase();
    const match = this.monthNames.find((item) => item.toLowerCase() === normalizedMonth);

    if (!match) {
      throw new BadRequestException('Invalid month value');
    }

    return match;
  }

  private resolveYear(year: string | number | undefined, currentDate: Date): number {
    if (year === undefined) {
      return currentDate.getFullYear();
    }

    const parsedYear = Number(year);

    if (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 3000) {
      throw new BadRequestException('Invalid year value');
    }

    return parsedYear;
  }
}
