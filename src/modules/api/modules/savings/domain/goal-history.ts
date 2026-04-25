export interface GoalHistory {
  id?: string;
  goalId: string;
  userId: string;
  field: string;
  oldValue: string | null;
  newValue: string;
  changedAt?: Date;
}
