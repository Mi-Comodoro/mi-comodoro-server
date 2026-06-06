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
  findActiveExpired(currentYear: number, currentMonth: number): Promise<Budget[]>;
  findClosedByFinancesId(financesId: string): Promise<Budget[]>;
  active(budgetId: string): Promise<Budget | null>;
  close(budgetId: string): Promise<Budget | null>;
  update(
    budgetId: string,
    data: Partial<
      Pick<
        Budget,
        'name' | 'strategy' | 'needsLimit' | 'wantsLimit' | 'savingsLimit' | 'customBuckets'
      >
    >,
  ): Promise<Budget | null>;
  softDelete(budgetId: string): Promise<void>;
  findDefaultActiveByOwnerId(ownerId: string): Promise<Budget | null>;
  setDefault(budgetId: string, ownerId: string): Promise<Budget>;
}
