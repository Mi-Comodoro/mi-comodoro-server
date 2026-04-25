import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';
import { AccountRepository } from '@/modules/api/modules/accounts/domain/repositories/account.respository';

import { GoalHistory } from '../../domain/goal-history';
import { GoalHistoryRepository } from '../../domain/repositories/goal-history.repository';
import { GoalsRepository } from '../../domain/repositories/goals.repository';
import { GoalStatus, SavingGoal } from '../../domain/savings-goals';
import { UpdateGoalDto } from '../../infrastructure/dto/update-goal.dto';
import { UpdateGoalStatusDto } from '../../infrastructure/dto/update-goal-status.dto';

@Injectable()
export class GoalsService {
  private readonly context: string = GoalsService.name;
  constructor(
    @Inject('GoalsRepository') private goalsRepository: GoalsRepository,
    @Inject('GoalHistoryRepository') private historyRepository: GoalHistoryRepository,
    @Inject('AccountRepository') private accountRepository: AccountRepository,
    private readonly logger: LoggerProviderService,
  ) {}
  async create(data: SavingGoal): Promise<SavingGoal> {
    this.logger.info(this.context, 'Creating saving goals');
    return await this.goalsRepository.create(data);
  }

  async find(userId: string): Promise<SavingGoal[]> {
    this.logger.info(this.context, `getting saving goals by userId: ${userId}`);
    return await this.goalsRepository.find(userId);
  }

  async findById(id: string, userId: string): Promise<SavingGoal> {
    this.logger.info(this.context, `getting saving goal by id: ${id}`);
    const goal = await this.goalsRepository.findByIdAndUser(id, userId);
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    return goal;
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
