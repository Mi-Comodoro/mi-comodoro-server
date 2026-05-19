import type { TravelExpense } from '../travel-expense';

export interface TravelExpenseRepository {
  save(expense: Partial<TravelExpense>): Promise<TravelExpense>;
  findById(id: string): Promise<TravelExpense | null>;
  findByGroup(groupId: string): Promise<TravelExpense[]>;
  update(id: string, data: Partial<TravelExpense>): Promise<void>;
  softDelete(id: string): Promise<void>;
}
