import { Budget } from '../budget';

export interface BudgetRepository {
  save(budget: Partial<Budget>): Promise<Budget>;
  findByFinancesIdAndMonth(financesId: string, month: string, year: number): Promise<Budget | null>;
  findPreviousByFinancesId(financesId: string, month: string, year: number): Promise<Budget | null>;
  findAllByFinancesId(financesId: string, year?: number): Promise<Budget[]>;
  findById(budgetId: string): Promise<Budget | null>;
  active(budgetId: string): Promise<Budget | null>;
}
