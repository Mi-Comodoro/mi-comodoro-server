export type HealthLevel = 'critical' | 'at_risk' | 'regular' | 'healthy' | 'optimal';

export interface FinancialHealthScore {
  id?: string;
  userId: string;
  totalScore: number;
  cashFlowScore: number;
  savingsScore: number;
  expenseScore: number;
  debtScore: number;
  level: HealthLevel;
  calculatedAt?: Date;
  totalTransactions?: number;
}
