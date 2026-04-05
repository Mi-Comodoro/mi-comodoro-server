// domain/repositories/transaction.repository.ts
import { Transaction, TransactionFilters, TransactionPagination } from '../transaction';

export interface TransactionRepository {
  save(domain: Partial<Transaction>): Promise<Transaction>;
  findByBudget(
    budgetId: string,
    filters: TransactionFilters,
  ): Promise<{
    data: Transaction[];
    pagination: TransactionPagination;
  }>;
}
