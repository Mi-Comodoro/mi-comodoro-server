import { GoalStatus, SavingGoal } from '../../domain/savings-goals';
import { SavingGoalEntity } from '../database/entities/saving-goals.entity';

export class SavingsGoalsMapper {
  static toDomain(entity: SavingGoalEntity): SavingGoal & { accountName: string } {
    return {
      id: entity.id,
      userId: entity.userId,
      name: entity.name,
      reason: entity.reason,
      targetAmount: entity.targetAmount != null ? Number(entity.targetAmount) : undefined,
      targetDate: entity.targetDate ? new Date(entity.targetDate) : undefined,
      isActive: entity.isActive,
      status: entity.status ?? GoalStatus.SCHEDULED,
      accountId: entity.accountId,
      accountName: entity.account ? entity.account.name : '',
      lastInterestDate: entity.lastInterestDate ?? null,
      updatedAt: entity.updatedAt,
      nulledAt: entity.nulledAt,
    };
  }
}
