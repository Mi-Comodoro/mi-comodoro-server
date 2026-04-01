// infrastructure/mapper/transaction.mapper.ts
import { BudgetEntity } from '@/modules/api/modules/budgets/infrastructure/database/entities/budget.entity';
import { CategoryEntity } from '@/modules/api/modules/categories/infrastructure/database/category.entity';
import { UserEntity } from '@/modules/api/modules/users/infrastructure/database/user.entity';

import { Transaction } from '../../domain/transaction';
import { TransactionEntity } from '../database/entities/transaction.entity';

export class TransactionMapper {
  static toDomain(entity: TransactionEntity): Transaction {
    return {
      id: entity.id,
      amount: Number(entity.amount),
      source: entity.source,
      description: entity.description,
      userId: entity.userId,
      budgetId: entity.budgetId,
      categoryId: entity.categoryId,
      type: entity.type,
      category: entity.category
        ? { id: entity.category.id, name: entity.category.name }
        : undefined,
      transactionDate: entity.transactionDate,
      nulledAt: entity.nulledAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toEntity(domain: Partial<Transaction>): TransactionEntity {
    const entity = new TransactionEntity();

    if (domain.id) entity.id = domain.id;

    entity.amount = Number(domain.amount);
    entity.source = domain.source as string;
    entity.description = domain.description as string;
    entity.userId = domain.userId as string;
    entity.budgetId = domain.budgetId as string;
    entity.categoryId = domain.categoryId as string;
    entity.type = domain.type as 'income' | 'expense' | 'savings';
    entity.transactionDate = domain.transactionDate as Date;

    if (domain.userId) {
      const user = new UserEntity();
      user.id = domain.userId;
      entity.user = user;
    }

    if (domain.budgetId) {
      const budget = new BudgetEntity();
      budget.id = domain.budgetId;
      entity.budget = budget;
    }

    if (domain.categoryId) {
      const category = new CategoryEntity();
      category.id = domain.categoryId;
      entity.category = category;
    }

    return entity;
  }
}
