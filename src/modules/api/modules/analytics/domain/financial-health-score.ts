export type HealthLevel = 'critical' | 'at_risk' | 'precarious' | 'regular' | 'healthy' | 'optimal';

export interface FinancialHealthScore {
  id?: string;
  userId: string;
  totalScore: number;
  cashFlowScore: number;
  savingsScore: number;
  expenseScore: number;
  debtScore: number;
  level: HealthLevel;
  cashFlowRate?: number;
  savingsRate?: number;
  expensesExcessPct?: number;
  dti?: number;
  avgMonthlyIncome?: number;
  calculatedAt?: Date;
  totalTransactions?: number;
  totalIncome?: number;
  totalExpenses?: number;
  totalSavings?: number;
}
