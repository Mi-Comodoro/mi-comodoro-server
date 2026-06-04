import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { toZonedTime } from 'date-fns-tz';
import { DataSource, EntityManager, IsNull } from 'typeorm';

import { SystemConfigService } from '@/core/modules/system-config/system-config.service';
import { LoggerProviderService } from '@/core/providers';
import { CategoryType } from '@/modules/api/modules/categories/domain/category';
import { CategoryEntity } from '@/modules/api/modules/categories/infrastructure/database/category.entity';
import { GoalsRepository } from '@/modules/api/modules/savings/domain/repositories/goals.repository';
import { PlannedSavingStatus } from '@/modules/api/modules/savings/domain/savings-planned';
import { PlannedSavingEntity } from '@/modules/api/modules/savings/infrastructure/database/entities/saving-planned.entity';
import { TransactionEntity } from '@/modules/api/modules/transactions/infrastructure/database/entities/transaction.entity';
import { UserRepository } from '@/modules/api/modules/users/domain/user.repository';

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
import { TransferBalanceDto } from '../infrastructure/dto/transfer-balance.dto';

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
    @Inject('UserRepository') private readonly userRepository: UserRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly systemConfigService: SystemConfigService,
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
      : await this.buildEmptyBudget(input.userId, finances.id, month, year, input.name);

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
    userId?: string,
  ): Promise<Budget | null> {
    if (userId) {
      await this.assertFinancesOwner(financesId, userId);
    }

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

  async getAllBudgetsByFinancesId(
    financesId: string,
    year?: number,
    userId?: string,
  ): Promise<Budget[]> {
    if (userId) {
      await this.assertFinancesOwner(financesId, userId);
    }

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
  async getBudgetById(budgetId: string, userId?: string): Promise<Budget> {
    this.logger.info(this.context, `Getting budget by ID: ${budgetId}`);
    return userId
      ? await this.assertBudgetOwner(budgetId, userId)
      : await this.getBudgetOrThrow(budgetId);
  }

  async updateBudget(
    budgetId: string,
    data: Partial<Pick<Budget, 'name' | 'strategy' | 'needsLimit' | 'wantsLimit' | 'savingsLimit'>>,
    userId?: string,
  ): Promise<Budget> {
    this.logger.info(this.context, `Updating budget ${budgetId}`);
    if (userId) {
      await this.assertBudgetOwner(budgetId, userId);
    }
    const updated = await this.budgetRepository.update(budgetId, data);
    if (!updated) {
      throw new NotFoundException(`Budget with ID: ${budgetId} not found`);
    }
    return updated;
  }

  async deleteBudget(budgetId: string, userId?: string): Promise<void> {
    this.logger.info(this.context, `Soft deleting budget ${budgetId}`);
    if (userId) {
      await this.assertBudgetOwner(budgetId, userId);
    } else {
      await this.getBudgetOrThrow(budgetId);
    }
    await this.budgetRepository.softDelete(budgetId);
  }

  async active(budgetId: string, userId?: string) {
    this.logger.info(this.context, `Getting budget by ID: ${budgetId}`);
    if (userId) {
      await this.assertBudgetOwner(budgetId, userId);
    } else {
      await this.getBudgetOrThrow(budgetId);
    }

    return await this.budgetRepository.active(budgetId);
  }
  async close(budgetId: string, dto: CloseBudgetDto = {}, userId?: string): Promise<Budget> {
    this.logger.info(this.context, `Closing budget by ID: ${budgetId}`);
    const budget = userId
      ? await this.assertBudgetOwner(budgetId, userId)
      : await this.getBudgetOrThrow(budgetId);

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
        await this.transferSurplusToGoal(
          budgetId,
          dto.targetGoalId,
          surplus,
          budget.ownerId,
          queryRunner.manager,
        );
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
      this.logger.error(
        this.context,
        `Error closing budget ${budgetId}: ${(err as Error).message}`,
      );
      throw err;
    } finally {
      await queryRunner.release();
    }

    return (await this.budgetRepository.findById(budgetId))!;
  }

  @Cron('0 * * * *')
  async processMonthlyClosures(): Promise<void> {
    this.logger.info(this.context, 'Verificando cierres de presupuesto mensuales por zona horaria');
    const users = await this.userRepository.findAll();
    for (const user of users) {
      const local = toZonedTime(new Date(), user.timezone ?? 'America/Bogota');
      const isStartOfDay = local.getHours() === 0 && local.getMinutes() < 5;
      const isEndOfMonth = local.getDate() === 1;
      if (isStartOfDay && isEndOfMonth) {
        try {
          await this.autoClose(user.id, user.timezone ?? 'America/Bogota');
        } catch (err) {
          this.logger.error(
            this.context,
            `Error en cierre automático para usuario ${user.id}: ${(err as Error).message}`,
          );
        }
      }
    }
  }

  async autoClose(userId: string, timezone: string): Promise<void> {
    const local = toZonedTime(new Date(), timezone);
    const currentYear = local.getFullYear();
    const currentMonth = local.getMonth() + 1;

    this.logger.info(
      this.context,
      `Ejecutando cierre automático de presupuestos para usuario ${userId}: ${currentYear}-${currentMonth}`,
    );

    const expired = await this.budgetRepository.findActiveExpired(currentYear, currentMonth);
    const userExpired = expired.filter((b) => b.ownerId === userId);

    this.logger.info(
      this.context,
      `Presupuestos expirados encontrados para usuario ${userId}: ${userExpired.length}`,
    );

    for (const budget of userExpired) {
      try {
        await this.budgetRepository.close(budget.id as string);
        this.logger.info(
          this.context,
          `Presupuesto ${budget.id} cerrado automáticamente para usuario ${userId}`,
        );
      } catch (err) {
        this.logger.error(
          this.context,
          `Error cerrando presupuesto ${budget.id}: ${(err as Error).message}`,
        );
      }
    }
  }

  async findClosed(userId: string): Promise<Budget[]> {
    this.logger.info(this.context, `Finding closed budgets for userId: ${userId}`);

    const finances = await this.financesRepository.findByUserId(userId);
    if (!finances?.id) {
      throw new NotFoundException('Finances not found for user');
    }

    return this.budgetRepository.findClosedByFinancesId(finances.id);
  }

  async transferBalance(budgetId: string, userId: string, dto: TransferBalanceDto): Promise<void> {
    if (!dto.targetBudgetId && !dto.goalId) {
      throw new BadRequestException('Se requiere targetBudgetId o goalId');
    }

    const budget = await this.assertBudgetOwner(budgetId, userId);
    if (budget.status !== 'CLOSED') {
      throw new BadRequestException('Solo se puede transferir desde presupuestos cerrados');
    }

    if (dto.targetBudgetId) {
      await this.assertBudgetOwner(dto.targetBudgetId, userId);
    }

    const surplus = await this.calculateSurplus(budgetId);
    if (dto.amount > surplus) {
      throw new BadRequestException(`El monto supera el saldo libre (${surplus})`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (dto.targetBudgetId) {
        await queryRunner.manager
          .createQueryBuilder()
          .update('budgets')
          .set({ carryForwardAmount: () => `COALESCE(carry_forward_amount, 0) + ${dto.amount}` })
          .where('id = :id', { id: dto.targetBudgetId })
          .execute();
      }

      if (dto.goalId) {
        await this.transferSurplusToGoal(
          budgetId,
          dto.goalId,
          dto.amount,
          userId,
          queryRunner.manager,
        );
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        this.context,
        `Error en transferencia desde presupuesto ${budgetId}: ${(err as Error).message}`,
      );
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async setDefaultBudget(budgetId: string, userId: string): Promise<Budget> {
    this.logger.info(this.context, `Estableciendo presupuesto ${budgetId} como predeterminado`);
    const budget = await this.assertBudgetOwner(budgetId, userId);
    if (budget.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Solo se puede establecer como predeterminado un presupuesto activo',
      );
    }
    return this.budgetRepository.setDefault(budgetId, userId);
  }

  async getDefaultBudget(userId: string): Promise<Budget | null> {
    return this.budgetRepository.findDefaultActiveByOwnerId(userId);
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
    manager: EntityManager,
  ): Promise<void> {
    this.logger.info(
      this.context,
      `Transfiriendo excedente de $${amount} a meta ${goalId} para usuario ${userId}`,
    );
    const goal = await this.goalsRepository.findById(goalId);
    if (!goal) {
      throw new NotFoundException(`Goal with ID: ${goalId} not found`);
    }
    if (goal.userId !== userId) {
      throw new NotFoundException(`Goal with ID: ${goalId} not found`);
    }

    const category = await manager.findOne(CategoryEntity, {
      where: { type: CategoryType.SAVINGS, nulledAt: IsNull() },
    });
    if (!category) {
      throw new NotFoundException('Categoría de ahorro no encontrada');
    }

    await manager.save(PlannedSavingEntity, {
      savingGoal: { id: goalId },
      account: { id: goal.accountId },
      budget: { id: budgetId },
      amount,
      date: new Date(),
      status: PlannedSavingStatus.COMPLETED,
      completedAt: new Date(),
    });

    await manager.save(TransactionEntity, {
      type: 'savings' as const,
      amount,
      source: goal.name,
      userId,
      budgetId,
      categoryId: category.id,
      accountId: goal.accountId,
      toAccountId: goal.accountId,
      transactionDate: new Date(),
      savingGoalId: goalId,
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

  private async getBudgetOrThrow(budgetId: string): Promise<Budget> {
    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget) {
      throw new NotFoundException(`Budget with ID: ${budgetId} not found`);
    }
    return budget;
  }

  private async assertBudgetOwner(budgetId: string, userId: string): Promise<Budget> {
    const budget = await this.getBudgetOrThrow(budgetId);
    if (budget.ownerId !== userId) {
      throw new NotFoundException(`Budget with ID: ${budgetId} not found`);
    }
    return budget;
  }

  private async assertFinancesOwner(financesId: string, userId: string): Promise<void> {
    const finances = await this.financesRepository.findByUserId(userId);
    if (!finances?.id || finances.id !== financesId) {
      throw new NotFoundException('Finances not found for user');
    }
  }

  private async buildEmptyBudget(
    userId: string,
    financesId: string,
    month: string,
    year: number,
    name?: string,
  ): Promise<Partial<Budget>> {
    const savingsLimit = await this.systemConfigService.getNumber('savings_default_pct', 20);
    return {
      name: this.resolveBudgetName(month, year, name),
      month,
      year,
      isShared: false,
      needsLimit: 50,
      wantsLimit: 30,
      savingsLimit,
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

  async deleteCustomBucket(budgetId: string, bucketId: string, userId: string): Promise<Budget> {
    const budget = await this.assertBudgetOwner(budgetId, userId);

    const bucket = (budget.customBuckets ?? []).find((b) => b.id === bucketId);
    if (!bucket) {
      throw new NotFoundException(`Bucket ${bucketId} no encontrado en el presupuesto`);
    }

    const updatedBuckets = (budget.customBuckets ?? []).filter((b) => b.id !== bucketId);
    return (await this.budgetRepository.update(budgetId, { customBuckets: updatedBuckets }))!;
  }
}
