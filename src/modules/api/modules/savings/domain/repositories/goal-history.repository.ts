import { GoalHistory } from '../goal-history';

export interface GoalHistoryRepository {
  add(entry: GoalHistory): Promise<GoalHistory>;
  findByGoalId(goalId: string): Promise<GoalHistory[]>;
}
