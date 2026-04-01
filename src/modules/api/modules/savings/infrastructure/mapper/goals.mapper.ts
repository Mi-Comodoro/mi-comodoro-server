import { SavingGoal } from '../../domain/savings-goals';
import { SavingGoalEntity } from '../database/entities/saving-goals.entity';

export class SavingsGoalsMapper {
  static toDomain(entity: SavingGoalEntity): SavingGoal & { accountName: string } {
    return {
      id: entity.id,
      userId: entity.userId,
      name: entity.name,
      reason: entity.reason,
      targetAmount: entity.targetAmount,
      targetDate: entity.targetDate,
      isActive: entity.isActive,
      accountId: entity.accountId,
      accountName: entity.account ? entity.account.name : '',
      updatedAt: entity.updatedAt,
    };
  }
}
