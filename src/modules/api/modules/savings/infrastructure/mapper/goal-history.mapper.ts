import { GoalHistory } from '../../domain/goal-history';
import { GoalHistoryEntity } from '../database/entities/goal-history.entity';

export class GoalHistoryMapper {
  static toDomain(entity: GoalHistoryEntity): GoalHistory {
    return {
      id: entity.id,
      goalId: entity.goalId,
      userId: entity.userId,
      field: entity.field,
      oldValue: entity.oldValue,
      newValue: entity.newValue,
      changedAt: entity.changedAt,
    };
  }

  static toEntity(domain: GoalHistory): GoalHistoryEntity {
    const entity = new GoalHistoryEntity();
    if (domain.id) entity.id = domain.id;
    entity.goalId = domain.goalId;
    entity.userId = domain.userId;
    entity.field = domain.field;
    entity.oldValue = domain.oldValue;
    entity.newValue = domain.newValue;
    if (domain.changedAt) entity.changedAt = domain.changedAt;
    return entity;
  }
}
