import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';
import { AccountRepository } from '@/modules/api/modules/accounts/domain/repositories/account.respository';
import { BudgetRepository } from '@/modules/api/modules/budgets/domain/repositories/budget.repository';
import { CategoryType } from '@/modules/api/modules/categories/domain/category';
import { CategoryRepository } from '@/modules/api/modules/categories/domain/repositories/category.repository';
import { FinancesRepository } from '@/modules/api/modules/finances/domain/repositories/finances.repository';
import { TransactionRepository } from '@/modules/api/modules/transactions/domain/repositories/transaction.repository';

import { GoalHistory } from '../../domain/goal-history';
import { GoalHistoryRepository } from '../../domain/repositories/goal-history.repository';
import { GoalsRepository } from '../../domain/repositories/goals.repository';
import { PlannedSavingRepository } from '../../domain/repositories/planned.repository';
import { GoalStatus, SavingGoal } from '../../domain/savings-goals';
import { PlannedSaving, PlannedSavingStatus } from '../../domain/savings-planned';
import { CreateContributionDto } from '../../infrastructure/dto/create-contribution.dto';
import { UpdateGoalDto } from '../../infrastructure/dto/update-goal.dto';
import { UpdateGoalStatusDto } from '../../infrastructure/dto/update-goal-status.dto';

@Injectable()
export class GoalsService {
  private readonly context: string = GoalsService.name;
  constructor(
    @Inject('GoalsRepository') private goalsRepository: GoalsRepository,
    @Inject('GoalHistoryRepository') private historyRepository: GoalHistoryRepository,
    @Inject('PlannedSavingRepository') private plannedSavingRepository: PlannedSavingRepository,
    @Inject('AccountRepository') private accountRepository: AccountRepository,
    @Inject('BudgetRepository') private budgetRepository: BudgetRepository,
    @Inject('FinancesRepository') private financesRepository: FinancesRepository,
    @Inject('TransactionRepository') private transactionRepository: TransactionRepository,
    @Inject('CategoryRepository') private categoryRepository: CategoryRepository,
    private readonly logger: LoggerProviderService,
  ) {}
  async create(data: SavingGoal): Promise<SavingGoal> {
    this.logger.info(this.context, 'Creating saving goals');
    return await this.goalsRepository.create(data);
  }

  async find(userId: string): Promise<(SavingGoal & { totalSaved: number })[]> {
    this.logger.info(this.context, `getting saving goals by userId: ${userId}`);
    const goals = await this.goalsRepository.find(userId);
    if (!goals.length) return [];

    const goalIds = goals.map((g) => g.id!).filter(Boolean);
    const totals = await this.plannedSavingRepository.sumCompletedByGoalIds(goalIds);
    const totalsMap = new Map(totals.map((t) => [t.goalId, t.total]));

    return goals.map((g) => ({ ...g, totalSaved: totalsMap.get(g.id!) ?? 0 }));
  }

  async findById(id: string, userId: string) {
    this.logger.info(this.context, `getting saving goal by id: ${id}`);
    const goal = await this.goalsRepository.findByIdAndUser(id, userId);
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    const plannedSavings = await this.plannedSavingRepository.findByGoalId(id);

    return { ...goal, plannedSavings };
  }

  async update(id: string, userId: string, dto: UpdateGoalDto): Promise<SavingGoal> {
    this.logger.info(this.context, `updating saving goal ${id} for user ${userId}`);

    const existing = await this.goalsRepository.findByIdAndUser(id, userId);
    if (!existing) {
      throw new NotFoundException(`Goal ${id} not found`);
    }

    // Si cambia accountId, validar que la cuenta existe y es del usuario
    if (dto.accountId && dto.accountId !== existing.accountId) {
      const accounts = await this.accountRepository.get(userId);
      const accountExists = accounts.some((acc) => acc.id === dto.accountId);
      if (!accountExists) {
        throw new BadRequestException(`Account ${dto.accountId} not found or not yours`);
      }
    }

    // Mapear DTO a Partial<SavingGoal> convirtiendo null a undefined
    const updateData: Partial<SavingGoal> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.reason !== undefined) updateData.reason = dto.reason;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.accountId !== undefined) updateData.accountId = dto.accountId;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.targetAmount !== undefined) {
      updateData.targetAmount = dto.targetAmount === null ? undefined : dto.targetAmount;
    }
    if (dto.targetDate !== undefined) {
      updateData.targetDate = dto.targetDate === null ? undefined : dto.targetDate;
    }

    // Registrar cambios en el historial
    await this.trackChanges(id, userId, existing, updateData);

    const updated = await this.goalsRepository.update(id, userId, updateData);
    if (!updated) {
      throw new NotFoundException(`Failed to update goal ${id}`);
    }

    return updated;
  }

  async deleteGoal(id: string, userId: string): Promise<{ success: boolean }> {
    this.logger.info(this.context, `deleting saving goal ${id} for user ${userId}`);

    const goal = await this.goalsRepository.findById(id);
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    if (goal.userId !== userId) {
      throw new UnauthorizedException();
    }

    await this.goalsRepository.delete(id);
    return { success: true };
  }

  async updateStatus(id: string, userId: string, dto: UpdateGoalStatusDto): Promise<SavingGoal> {
    this.logger.info(
      this.context,
      `updating status of saving goal ${id} for user ${userId} to ${dto.status}`,
    );

    const existing = await this.goalsRepository.findByIdAndUser(id, userId);
    if (!existing) {
      throw new NotFoundException(`Goal ${id} not found`);
    }

    // Validar transiciones de estado
    const validTransitions: Record<GoalStatus, GoalStatus[]> = {
      [GoalStatus.SCHEDULED]: [GoalStatus.IN_PROGRESS, GoalStatus.PAUSED],
      [GoalStatus.IN_PROGRESS]: [GoalStatus.COMPLETED, GoalStatus.PAUSED],
      [GoalStatus.PAUSED]: [GoalStatus.IN_PROGRESS, GoalStatus.SCHEDULED],
      [GoalStatus.COMPLETED]: [],
    };

    const currentStatus = existing.status ?? GoalStatus.SCHEDULED;
    const allowedStatuses = validTransitions[currentStatus];
    if (!allowedStatuses.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${dto.status}`,
      );
    }

    // Registrar cambio de estado en el historial
    await this.trackChanges(id, userId, existing, { status: dto.status });

    const updated = await this.goalsRepository.update(id, userId, { status: dto.status });
    if (!updated) {
      throw new NotFoundException(`Failed to update goal ${id}`);
    }

    return updated;
  }

  async getHistory(goalId: string, userId: string): Promise<GoalHistory[]> {
    this.logger.info(this.context, `getting history for goal ${goalId}`);

    // Verificar que el goal pertenece al usuario
    const goal = await this.goalsRepository.findById(goalId);
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    if (goal.userId !== userId) {
      throw new UnauthorizedException();
    }

    return await this.historyRepository.findByGoalId(goalId);
  }

  async createContribution(
    goalId: string,
    userId: string,
    dto: CreateContributionDto,
  ): Promise<PlannedSaving> {
    this.logger.info(this.context, `creating contribution for goal ${goalId}`);

    // 1. Validar que el goal existe y pertenece al usuario
    const goal = await this.goalsRepository.findByIdAndUser(goalId, userId);
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    const contributionType = dto.contributionType ?? 'external';

    // 2. Si es internal, validar que la cuenta existe y pertenece al usuario
    if (contributionType === 'internal') {
      if (!dto.accountId) {
        throw new BadRequestException('accountId is required for internal contributions');
      }
      const accounts = await this.accountRepository.get(userId);
      const accountExists = accounts.some((acc) => acc.id === dto.accountId);
      if (!accountExists) {
        throw new BadRequestException(`Account ${dto.accountId} not found or not yours`);
      }
    }

    // 3. Obtener el budget activo del mes/año actual
    const finances = await this.financesRepository.findByUserId(userId);
    if (!finances?.id) {
      throw new NotFoundException('Finances not found for user');
    }

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
    const now = new Date();
    const currentMonth = MONTH_NAMES[now.getMonth()];
    const currentYear = now.getFullYear();

    const budget = await this.budgetRepository.findByFinancesIdAndMonth(
      finances.id,
      currentMonth,
      currentYear,
    );
    if (!budget) {
      throw new NotFoundException(
        `No budget found for current month (${currentMonth}/${currentYear})`,
      );
    }

    // 4. Crear el PlannedSaving con status COMPLETED
    const plannedSaving = await this.plannedSavingRepository.save({
      savingGoalId: goalId,
      budgetId: budget.id,
      accountId: contributionType === 'internal' ? dto.accountId : undefined,
      amount: dto.amount,
      date: new Date(dto.date),
      status: PlannedSavingStatus.COMPLETED,
      completedAt: new Date(),
    });

    // 5. Crear transacción de tipo ahorro (no bloquea el flujo si falla)
    try {
      const category = await this.categoryRepository.findByType(CategoryType.SAVINGS);
      if (category) {
        await this.transactionRepository.save({
          type: 'savings' as const,
          amount: dto.amount,
          source: goal.name,
          userId,
          budgetId: budget.id,
          categoryId: category.id,
          accountId: goal.accountId ?? undefined,
          toAccountId: goal.accountId ?? undefined,
          transactionDate: new Date(dto.date),
          savingGoalId: goalId,
        });
      }
    } catch (err) {
      this.logger.warn(
        this.context,
        `Failed to create savings transaction for goal ${goalId}: ${(err as Error).message}`,
      );
    }

    return plannedSaving;
  }

  async getGoalContributions(goalId: string, userId: string) {
    this.logger.info(this.context, `getting contributions for goal ${goalId}`);

    const goal = await this.goalsRepository.findById(goalId);
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    if (goal.userId !== userId) {
      throw new UnauthorizedException();
    }

    return await this.transactionRepository.findByGoalId(goalId);
  }

  private async trackChanges(
    goalId: string,
    userId: string,
    current: SavingGoal,
    updates: Partial<SavingGoal>,
  ): Promise<void> {
    const fieldsToTrack: (keyof SavingGoal)[] = [
      'name',
      'reason',
      'targetAmount',
      'targetDate',
      'isActive',
      'status',
    ];

    for (const field of fieldsToTrack) {
      if (updates[field] === undefined) continue;

      const oldVal = String(current[field] ?? '');
      const newVal = String(updates[field] ?? '');

      if (oldVal !== newVal) {
        await this.historyRepository.add({
          goalId,
          userId,
          field,
          oldValue: oldVal || null,
          newValue: newVal,
        });
      }
    }
  }
}
