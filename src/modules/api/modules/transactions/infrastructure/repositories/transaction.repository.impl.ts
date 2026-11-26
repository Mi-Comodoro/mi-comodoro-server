// infrastructure/repositories/transaction.repository.impl.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  EntityManager,
  FindOptionsWhere,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { BudgetTotals } from '../../domain/budget-balance';
import {
  GoalSummary,
  TransactionRepository,
} from '../../domain/repositories/transaction.repository';
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
    const {
      type,
      categoryId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      includeCategory = true,
    } = filters;

    const where: FindOptionsWhere<TransactionEntity> = { budgetId, nulledAt: IsNull() };

    if (type) where.type = type === 'savings' ? In(['savings', 'interest']) : type;
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
      relations: includeCategory ? { category: true } : {},
      // Desempate estable: sin él, las del mismo momento cambian de orden entre una carga y otra
      order: { transactionDate: 'DESC', createdAt: 'DESC', id: 'DESC' },
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

  async getBudgetTotals(budgetId: string, manager?: EntityManager): Promise<BudgetTotals> {
    // Con un manager la suma se lee dentro de la transacción que ya bloqueó el presupuesto
    const repository = manager
      ? manager.getRepository(TransactionEntity)
      : this.transactionRepository;
    const rows = await repository
      .createQueryBuilder('t')
      .select('t.type', 'type')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'total')
      .where('t.budget_id = :budgetId', { budgetId })
      .andWhere('t.nulled_at IS NULL')
      .groupBy('t.type')
      .getRawMany<{ type: string; total: string }>();

    const sum = (type: string) => Number(rows.find((r) => r.type === type)?.total ?? 0);
    return { income: sum('income'), expense: sum('expense'), savings: sum('savings') };
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.transactionRepository.update(id, { nulledAt: new Date() });
    return (result.affected ?? 0) > 0;
  }

  async findByGoalId(goalId: string): Promise<Transaction[]> {
    const entities = await this.transactionRepository.find({
      where: { savingGoalId: goalId, nulledAt: IsNull() },
      // Desempate estable: sin él, las del mismo momento cambian de orden entre una carga y otra
      order: { transactionDate: 'DESC', createdAt: 'DESC', id: 'DESC' },
    });
    return entities.map(TransactionMapper.toDomain);
  }

  async getGoalSummary(
    goalId: string,
    userId: string,
    accountId: string,
    goalName: string,
  ): Promise<GoalSummary> {
    // Interest from completePlannedSaving was historically saved without savingGoalId.
    // Include those orphaned transactions by matching on user + account + source pattern.
    const orphanedInterestSource = `Interés: ${goalName}`;

    const rows = await this.transactionRepository
      .createQueryBuilder('t')
      .select('t.type', 'type')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.nulled_at IS NULL')
      .andWhere("t.type IN ('savings', 'interest')")
      .andWhere(
        `(
          t.saving_goal_id = :goalId
          OR (
            t.type = 'interest'
            AND t.user_id = :userId
            AND t.account_id = :accountId
            AND t.saving_goal_id IS NULL
            AND t.source = :orphanedSource
          )
        )`,
        { goalId, userId, accountId, orphanedSource: orphanedInterestSource },
      )
      .groupBy('t.type')
      .getRawMany<{ type: string; total: string }>();

    const map = new Map(rows.map((r) => [r.type, Number(r.total) || 0]));
    return {
      totalSavings: map.get('savings') ?? 0,
      totalInterest: map.get('interest') ?? 0,
    };
  }
}
