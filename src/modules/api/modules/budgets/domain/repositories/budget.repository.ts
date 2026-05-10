import { Budget } from '../budget';

export interface BudgetHistoricalSummary {
  month: string;
  year: number;
  status: string;
  expectedIncome: number;
  receivedIncome: number;
  totalExpenses: number;
  totalSavings: number;
}

export interface BudgetRepository {
  save(budget: Partial<Budget>): Promise<Budget>;
  findByFinancesIdAndMonth(financesId: string, month: string, year: number): Promise<Budget | null>;
  findPreviousByFinancesId(financesId: string, month: string, year: number): Promise<Budget | null>;
  findAllByFinancesId(financesId: string, year?: number): Promise<Budget[]>;
  findHistoricalSummaryByFinancesId(
    financesId: string,
    year: number,
  ): Promise<BudgetHistoricalSummary[]>;
  findById(budgetId: string): Promise<Budget | null>;
  active(budgetId: string): Promise<Budget | null>;
  close(budgetId: string): Promise<Budget | null>;
}
