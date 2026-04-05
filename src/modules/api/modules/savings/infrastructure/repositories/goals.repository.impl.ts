import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GoalsRepository } from '../../domain/repositories/goals.repository';
import { SavingGoal } from '../../domain/savings-goals';
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
      where: { userId },
      relations: { account: true },
    });
    return result.map((item) => SavingsGoalsMapper.toDomain(item));
  }

  async findById(id: string): Promise<SavingGoal | null> {
    const result = await this.savingsGoalsRepository.findOne({
      where: { id },
      relations: { account: true },
    });
    if (!result) {
      return null;
    }
    return SavingsGoalsMapper.toDomain(result);
  }
}
