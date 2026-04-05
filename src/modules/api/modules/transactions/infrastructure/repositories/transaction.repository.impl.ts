// infrastructure/repositories/transaction.repository.impl.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';

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

  async findByBudget(
    budgetId: string,
    filters: TransactionFilters,
  ): Promise<{
    data: Transaction[];
    pagination: TransactionPagination;
  }> {
    const { type, categoryId, dateFrom, dateTo, page = 1, limit = 20 } = filters;

    const where: FindOptionsWhere<TransactionEntity> = { budgetId };

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
}
