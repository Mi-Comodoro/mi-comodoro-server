import { FinancialHealthScore } from '../financial-health-score';

export interface FinancialHealthScoreRepository {
  insert(score: Omit<FinancialHealthScore, 'id' | 'calculatedAt'>): Promise<FinancialHealthScore>;
  findRecentByUserId(userId: string): Promise<FinancialHealthScore | null>;
}
