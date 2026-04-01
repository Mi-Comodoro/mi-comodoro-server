import { GetPlannedExpensesDto, PlannedExpense } from '../expenses';

export interface PlannedExpenseRepository {
  add(data: PlannedExpense): Promise<PlannedExpense>;
  findByBudget(budgetId: string): Promise<PlannedExpense[]>;
  findAll(filters: GetPlannedExpensesDto): Promise<{
    data: PlannedExpense[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>;
}
