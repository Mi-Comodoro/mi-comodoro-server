import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { TravelExpenseRepository } from '../../domain/repositories/travel-expense.repository';
import type { TravelExpense } from '../../domain/travel-expense';
import { TravelExpenseEntity } from '../database/entities/travel-expense.entity';

@Injectable()
export class TravelExpenseRepositoryImpl implements TravelExpenseRepository {
  constructor(
    @InjectRepository(TravelExpenseEntity)
    private readonly repo: Repository<TravelExpenseEntity>,
  ) {}

  async save(expense: Partial<TravelExpense>): Promise<TravelExpense> {
    const entity = this.repo.create(expense);
    const saved = await this.repo.save(entity);
    return { ...saved, amount: Number(saved.amount) };
  }

  async findById(id: string): Promise<TravelExpense | null> {
    const entity = await this.repo.findOne({ where: { id, nulledAt: IsNull() } });
    if (!entity) return null;
    return { ...entity, amount: Number(entity.amount) };
  }

  async findByGroup(groupId: string): Promise<TravelExpense[]> {
    const entities = await this.repo.find({ where: { groupId, nulledAt: IsNull() } });
    return entities.map((e) => ({ ...e, amount: Number(e.amount) }));
  }

  async update(id: string, data: Partial<TravelExpense>): Promise<void> {
    await this.repo.update(id, data);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(id, { nulledAt: new Date() });
  }
}
