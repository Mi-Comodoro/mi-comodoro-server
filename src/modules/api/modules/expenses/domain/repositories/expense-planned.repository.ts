import { GetPlannedExpensesDto, PlannedExpense } from '../expenses';

export interface PlannedExpenseRepository {
  add(data: PlannedExpense): Promise<PlannedExpense>;
  findByBudget(budgetId: string): Promise<PlannedExpense[]>;
  findAll(filters: GetPlannedExpensesDto): Promise<{
    data: PlannedExpense[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>;
  findById(id: string): Promise<PlannedExpense | null>;
  update(id: string, data: Partial<PlannedExpense>): Promise<PlannedExpense | null>;
  cancel(id: string): Promise<PlannedExpense>;
  complete(id: string): Promise<PlannedExpense>;
}
