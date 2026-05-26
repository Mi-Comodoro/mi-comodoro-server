import { PlannedIncome } from '../income-planned';
import { IncomeSource } from '../incomes';

export interface PlannedIncomeRepository {
  create(domain: Partial<PlannedIncome>): Promise<Partial<PlannedIncome>>;
  generateIncomesPlannedForBudget(
    budgetId: string,
    incomes: IncomeSource[],
    year: number,
    month: number,
  ): Promise<void>;

  findByBudgetId(budgetId: string): Promise<Partial<PlannedIncome & { source: string }>[]>;
  findByBudgetAndUser(
    budgetId: string,
    userId: string,
  ): Promise<Partial<PlannedIncome & { source: string }>[]>;
  findById(id: string): Promise<Partial<PlannedIncome & { source: string }> | null>;
  findAllPlanedIncomes(): Promise<Partial<PlannedIncome & { source: string }>[]>;
  markAsReceive(
    id: string,
  ): Promise<Partial<PlannedIncome & { source: string }> | null | undefined>;
  delete(id: string): Promise<void>;
}
