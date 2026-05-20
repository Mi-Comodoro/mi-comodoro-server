// infrastructure/repositories/transaction.repository.impl.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { TransactionRepository } from '../../domain/repositories/transaction.repository';
import { Transaction, TransactionFilters, TransactionPagination } from '../../domain/transaction';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { TransactionMapper } from '../mapper/transaction.mapper';

@Injectable()
export class TransactionRepositoryImpl implements TransactionRepository {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
  ) {}

  async save(domain: Partial<Transaction>): Promise<Transaction> {
    const entity = TransactionMapper.toEntity(domain);
    const saved = await this.transactionRepository.save(entity);
    return TransactionMapper.toDomain(saved);
  }

  async findById(id: string): Promise<Transaction | null> {
    const entity = await this.transactionRepository.findOne({
      where: { id, nulledAt: IsNull() },
      relations: { category: true },
    });
    return entity ? TransactionMapper.toDomain(entity) : null;
  }

  async update(id: string, data: Partial<Transaction>): Promise<Transaction | null> {
    // Crear objeto de actualización solo con campos definidos
    const updateData: Partial<TransactionEntity> = {};

    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.transactionDate !== undefined) updateData.transactionDate = data.transactionDate;

    const result = await this.transactionRepository.update(id, updateData);
    if (result.affected === 0) return null;

    return await this.findById(id);
  }

  async findByBudget(
    budgetId: string,
    filters: TransactionFilters,
  ): Promise<{
    data: Transaction[];
    pagination: TransactionPagination;
  }> {
    const { type, categoryId, dateFrom, dateTo, page = 1, limit = 20 } = filters;

    const where: FindOptionsWhere<TransactionEntity> = { budgetId, nulledAt: IsNull() };

    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (dateFrom || dateTo) {
      where.transactionDate =
        dateFrom && dateTo
          ? Between(new Date(dateFrom), new Date(dateTo))
          : dateFrom
            ? MoreThanOrEqual(new Date(dateFrom))
            : LessThanOrEqual(new Date(dateTo!));
    }

    const [entities, total] = await this.transactionRepository.findAndCount({
      where,
      relations: { category: true },
      order: { transactionDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: entities.map(TransactionMapper.toDomain),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.transactionRepository.update(id, { nulledAt: new Date() });
    return (result.affected ?? 0) > 0;
  }

  async findByGoalId(goalId: string): Promise<Transaction[]> {
    const entities = await this.transactionRepository.find({
      where: { savingGoalId: goalId, nulledAt: IsNull() },
      order: { transactionDate: 'DESC' },
    });
    return entities.map(TransactionMapper.toDomain);
  }
}
