export type INCOME_STATUS = 'PENDING' | 'RECEIVED' | 'SKIPPED';
export interface PlannedIncome {
  id?: string;
  amount: number;
  date: Date;
  budgetId: string;
  incomeSourceId?: string;
  source: string;
  status: INCOME_STATUS;
  createdAt?: Date;
  updatedAt?: Date;
}
