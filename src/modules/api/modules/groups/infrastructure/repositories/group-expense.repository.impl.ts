import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { GroupExpense } from '../../domain/group-expense';
import type { GroupExpenseRepository } from '../../domain/repositories/group-expense.repository';
import { GroupExpenseEntity } from '../database/entities/group-expense.entity';

@Injectable()
export class GroupExpenseRepositoryImpl implements GroupExpenseRepository {
  constructor(
    @InjectRepository(GroupExpenseEntity)
    private readonly repo: Repository<GroupExpenseEntity>,
  ) {}

  async findByGroup(groupId: string): Promise<GroupExpense[]> {
    const entities = await this.repo.find({
      where: { groupId, nulledAt: IsNull() },
      order: { dueDate: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findById(id: string): Promise<GroupExpense | null> {
    const entity = await this.repo.findOne({ where: { id, nulledAt: IsNull() } });
    return entity ? this.toDomain(entity) : null;
  }

  async save(expense: Partial<GroupExpense>): Promise<GroupExpense> {
    const entity = this.repo.create({
      ...expense,
      amount: expense.amount,
      dueDate: expense.dueDate,
    });
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async update(id: string, data: Partial<GroupExpense>): Promise<GroupExpense> {
    await this.repo.update(id, {
      ...(data.description !== undefined && { description: data.description }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.responsibleUserId !== undefined && { responsibleUserId: data.responsibleUserId }),
    });
    const updated = await this.repo.findOneOrFail({ where: { id } });
    return this.toDomain(updated);
  }

  async updateStatus(
    id: string,
    status: GroupExpense['status'],
    extra?: { transactionId?: string; cxpId?: string; cxcId?: string },
  ): Promise<GroupExpense> {
    await this.repo.update(id, { status, ...extra });
    const updated = await this.repo.findOneOrFail({ where: { id } });
    return this.toDomain(updated);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(id, { nulledAt: new Date() });
  }

  private toDomain(entity: GroupExpenseEntity): GroupExpense {
    return {
      id: entity.id,
      groupId: entity.groupId,
      description: entity.description,
      amount: Number(entity.amount),
      dueDate: entity.dueDate,
      responsibleUserId: entity.responsibleUserId,
      status: entity.status,
      transactionId: entity.transactionId ?? null,
      cxpId: entity.cxpId ?? null,
      cxcId: entity.cxcId ?? null,
      nulledAt: entity.nulledAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
