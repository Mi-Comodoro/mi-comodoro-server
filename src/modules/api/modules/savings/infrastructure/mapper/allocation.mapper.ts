import { SavingAllocation } from '../../domain/savings-allocations';
import { SavingAllocationEntity } from '../database/entities/saving-allocations.entity';

export class SavingAllocationMapper {
  static toDomain(entity: SavingAllocationEntity): SavingAllocation {
    return {
      id: entity.id,
      goalId: entity.goalId,
      budgetId: entity.budgetId,
      percentage: entity.percentage,
      updatedAt: entity.updatedAt,
      goal: entity.goal,
    };
  }
}
