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
      accountId: entity.accountId, // ← campo directo
      fromAccountId: entity.fromAccountId,
      toAccountId: entity.toAccountId,
      type: entity.type,
      category: entity.category
        ? { id: entity.category.id, name: entity.category.name }
        : undefined,
      account: entity.account ? { id: entity.account.id, name: entity.account.name } : undefined,
      fromAccount: entity.fromAccount
        ? { id: entity.fromAccount.id, name: entity.fromAccount.name }
        : undefined,
      toAccount: entity.toAccount
        ? { id: entity.toAccount.id, name: entity.toAccount.name }
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
    if (domain.amount !== undefined) entity.amount = Number(domain.amount);
    if (domain.source) entity.source = domain.source;
    if (domain.description !== undefined) entity.description = domain.description;
    if (domain.userId) entity.userId = domain.userId;
    if (domain.budgetId) entity.budgetId = domain.budgetId;
    if (domain.categoryId) entity.categoryId = domain.categoryId;
    if (domain.type) entity.type = domain.type;
    if (domain.transactionDate) entity.transactionDate = domain.transactionDate;
    if (domain.nulledAt !== undefined) entity.nulledAt = domain.nulledAt;

    if (domain.billId) {
      entity.billId = domain.billId;
    }

    if (domain.plannedExpenseId) {
      entity.plannedExpenseId = domain.plannedExpenseId;
    }

    if (domain.plannedIncomeId) {
      entity.plannedIncomeId = domain.plannedIncomeId;
    }

    if (domain.accountId) {
      entity.accountId = domain.accountId;
    }

    if (domain.fromAccountId) {
      entity.fromAccountId = domain.fromAccountId;
    }

    if (domain.toAccountId) {
      entity.toAccountId = domain.toAccountId;
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

    if (domain.fromAccountId) {
      entity.fromAccountId = domain.fromAccountId;
      const fromAccount = new AccountEntity();
      fromAccount.id = domain.fromAccountId;
      entity.fromAccount = fromAccount;
    }

    if (domain.toAccountId) {
      entity.toAccountId = domain.toAccountId;
      const toAccount = new AccountEntity();
      toAccount.id = domain.toAccountId;
      entity.toAccount = toAccount;
    }

    return entity;
  }
}
