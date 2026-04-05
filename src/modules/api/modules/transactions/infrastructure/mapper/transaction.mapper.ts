// infrastructure/mapper/transaction.mapper.ts
import { BudgetEntity } from '@/modules/api/modules/budgets/infrastructure/database/entities/budget.entity';
import { CategoryEntity } from '@/modules/api/modules/categories/infrastructure/database/category.entity';
import { UserEntity } from '@/modules/api/modules/users/infrastructure/database/user.entity';

import { AccountEntity } from '../../../accounts/infrastructure/database/account.entity';
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
      billId: entity.billId,
      plannedExpenseId: entity.plannedExpenseId,
      plannedIncomeId: entity.plannedIncomeId,
      accountId: entity.account?.id, // ← desde relación
      type: entity.type,
      category: entity.category
        ? { id: entity.category.id, name: entity.category.name }
        : undefined,
      account: entity.account ? { id: entity.account.id, name: entity.account.name } : undefined,
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

    if (domain.billId) {
      entity.billId = domain.billId;
    }

    if (domain.plannedExpenseId) {
      entity.plannedExpenseId = domain.plannedExpenseId;
    }

    if (domain.plannedIncomeId) {
      entity.plannedIncomeId = domain.plannedIncomeId;
    }

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

    if (domain.accountId) {
      // ← necesario para savings
      const account = new AccountEntity();
      account.id = domain.accountId;
      entity.account = account;
    }

    return entity;
  }
}
