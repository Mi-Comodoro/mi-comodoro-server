import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';

import { AccountEntity } from '@/modules/api/modules/accounts/infrastructure/database/account.entity';

import { GoalsRepository } from '../../domain/repositories/goals.repository';
import { GoalStatus, SavingGoal } from '../../domain/savings-goals';
import { SavingGoalEntity } from '../database/entities/saving-goals.entity';
import { SavingsGoalsMapper } from '../mapper/goals.mapper';

export class GoalsRepositoryImpl implements GoalsRepository {
  constructor(
    @InjectRepository(SavingGoalEntity)
    private readonly savingsGoalsRepository: Repository<SavingGoalEntity>,
  ) {}
  async create(data: SavingGoal): Promise<SavingGoal> {
    const result = await this.savingsGoalsRepository.save(data);
    return SavingsGoalsMapper.toDomain(result);
  }
  async find(userId: string): Promise<SavingGoal[]> {
    const result = await this.savingsGoalsRepository.find({
      where: { userId, nulledAt: IsNull() },
      relations: { account: true },
    });
    return result.map((item) => SavingsGoalsMapper.toDomain(item));
  }

  async findById(id: string): Promise<SavingGoal | null> {
    const result = await this.savingsGoalsRepository.findOne({
      where: { id, nulledAt: IsNull() },
      relations: { account: true },
    });
    if (!result) {
      return null;
    }
    return SavingsGoalsMapper.toDomain(result);
  }

  async findByIdAndUser(id: string, userId: string): Promise<SavingGoal | null> {
    const entity = await this.savingsGoalsRepository.findOne({
      where: { id, userId, nulledAt: IsNull() },
      relations: { account: true },
    });
    if (!entity) return null;
    return SavingsGoalsMapper.toDomain(entity);
  }

  async update(id: string, userId: string, data: Partial<SavingGoal>): Promise<SavingGoal | null> {
    const existing = await this.savingsGoalsRepository.findOne({
      where: { id, userId },
    });
    if (!existing) return null;

    const updateData: Partial<SavingGoalEntity> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.status !== undefined) updateData.status = data.status;

    // Campos nullables — distinguir entre null (borrar) y undefined (no tocar)
    if (data.targetAmount !== undefined) {
      updateData.targetAmount = data.targetAmount as number;
    }
    if (data.targetDate !== undefined) {
      updateData.targetDate = data.targetDate as Date;
    }
    if (data.accountId !== undefined) {
      const account = new AccountEntity();
      account.id = data.accountId;
      updateData.account = account;
      updateData.accountId = data.accountId;
    }

    const result = await this.savingsGoalsRepository.update(id, updateData);
    if (result.affected === 0) return null;

    return this.findByIdAndUser(id, userId);
  }

  async findActiveWithInterest(): Promise<SavingGoal[]> {
    const result = await this.savingsGoalsRepository.find({
      where: {
        status: GoalStatus.IN_PROGRESS,
        isActive: true,
        nulledAt: IsNull(),
        account: { interestRate: MoreThan(0) },
      },
      relations: { account: true },
    });
    return result.map((item) => SavingsGoalsMapper.toDomain(item));
  }

  async updateLastInterestDate(id: string, date: Date): Promise<void> {
    await this.savingsGoalsRepository.update(id, { lastInterestDate: date });
  }

  async delete(id: string): Promise<void> {
    await this.savingsGoalsRepository.update(id, { nulledAt: new Date() });
  }
}
