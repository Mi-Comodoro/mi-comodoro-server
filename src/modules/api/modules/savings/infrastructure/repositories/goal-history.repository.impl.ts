import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GoalHistory } from '../../domain/goal-history';
import { GoalHistoryRepository } from '../../domain/repositories/goal-history.repository';
import { GoalHistoryEntity } from '../database/entities/goal-history.entity';
import { GoalHistoryMapper } from '../mapper/goal-history.mapper';

export class GoalHistoryRepositoryImpl implements GoalHistoryRepository {
  constructor(
    @InjectRepository(GoalHistoryEntity)
    private readonly goalHistoryRepository: Repository<GoalHistoryEntity>,
  ) {}

  async add(entry: GoalHistory): Promise<GoalHistory> {
    const entity = GoalHistoryMapper.toEntity(entry);
    const result = await this.goalHistoryRepository.save(entity);
    return GoalHistoryMapper.toDomain(result);
  }

  async findByGoalId(goalId: string): Promise<GoalHistory[]> {
    const entities = await this.goalHistoryRepository.find({
      where: { goalId },
      order: { changedAt: 'DESC' },
    });
    return entities.map((entity) => GoalHistoryMapper.toDomain(entity));
  }
}
