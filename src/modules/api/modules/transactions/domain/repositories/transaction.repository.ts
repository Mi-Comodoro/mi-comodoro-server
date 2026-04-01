// domain/repositories/transaction.repository.ts
import { Transaction } from '../transaction';

export interface TransactionRepository {
  save(domain: Partial<Transaction>): Promise<Transaction>;
  findByBudget(budgetId: string, type?: 'income' | 'expense' | 'savings'): Promise<Transaction[]>;
}
