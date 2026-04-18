import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';
import { AccountRepository } from '@/modules/api/modules/accounts/domain/repositories/account.respository';

import { GoalsRepository } from '../../domain/repositories/goals.repository';
import { SavingGoal } from '../../domain/savings-goals';
import { UpdateGoalDto } from '../../infrastructure/dto/update-goal.dto';

@Injectable()
export class GoalsService {
  private readonly context: string = GoalsService.name;
  constructor(
    @Inject('GoalsRepository') private goalsRepository: GoalsRepository,
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
    if (dto.targetAmount !== undefined) {
      updateData.targetAmount = dto.targetAmount === null ? undefined : dto.targetAmount;
    }
    if (dto.targetDate !== undefined) {
      updateData.targetDate = dto.targetDate === null ? undefined : dto.targetDate;
    }

    const updated = await this.goalsRepository.update(id, userId, updateData);
    if (!updated) {
      throw new NotFoundException(`Failed to update goal ${id}`);
    }

    return updated;
  }
}
