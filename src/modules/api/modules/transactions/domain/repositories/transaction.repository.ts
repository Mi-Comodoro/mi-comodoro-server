// domain/repositories/transaction.repository.ts
import { Transaction, TransactionFilters, TransactionPagination } from '../transaction';

export interface GoalSummary {
  totalSavings: number;
  totalInterest: number;
}

export interface TransactionRepository {
  save(domain: Partial<Transaction>): Promise<Transaction>;
  findByBudget(
    budgetId: string,
    filters: TransactionFilters,
  ): Promise<{
    data: Transaction[];
    pagination: TransactionPagination;
  }>;
  findById(id: string): Promise<Transaction | null>;
  update(id: string, data: Partial<Transaction>): Promise<Transaction | null>;
  softDelete(id: string): Promise<boolean>;
  findByGoalId(goalId: string): Promise<Transaction[]>;
  getGoalSummary(goalId: string): Promise<GoalSummary>;
}
