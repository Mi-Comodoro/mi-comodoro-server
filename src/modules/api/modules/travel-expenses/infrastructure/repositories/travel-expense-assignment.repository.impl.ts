import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { TravelExpenseAssignmentRepository } from '../../domain/repositories/travel-expense-assignment.repository';
import type { TravelExpenseAssignment } from '../../domain/travel-expense-assignment';
import { TravelExpenseAssignmentEntity } from '../database/entities/travel-expense-assignment.entity';

@Injectable()
export class TravelExpenseAssignmentRepositoryImpl implements TravelExpenseAssignmentRepository {
  constructor(
    @InjectRepository(TravelExpenseAssignmentEntity)
    private readonly repo: Repository<TravelExpenseAssignmentEntity>,
  ) {}

  async saveMany(
    assignments: Partial<TravelExpenseAssignment>[],
  ): Promise<TravelExpenseAssignment[]> {
    const entities = this.repo.create(assignments);
    const saved = await this.repo.save(entities);
    return saved.map((a) => ({ ...a, assignedAmount: Number(a.assignedAmount) }));
  }

  async findByExpense(expenseId: string): Promise<TravelExpenseAssignment[]> {
    const entities = await this.repo.find({ where: { expenseId, nulledAt: IsNull() } });
    return entities.map((a) => ({ ...a, assignedAmount: Number(a.assignedAmount) }));
  }

  async findByExpenseAndUser(
    expenseId: string,
    userId: string,
  ): Promise<TravelExpenseAssignment | null> {
    const entity = await this.repo.findOne({
      where: { expenseId, userId, nulledAt: IsNull() },
    });
    if (!entity) return null;
    return { ...entity, assignedAmount: Number(entity.assignedAmount) };
  }

  async deleteByExpense(expenseId: string): Promise<void> {
    await this.repo.update({ expenseId }, { nulledAt: new Date() });
  }

  async settle(id: string): Promise<void> {
    await this.repo.update(id, { settled: true });
  }
}
