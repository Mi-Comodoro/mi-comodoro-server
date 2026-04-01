export enum PlannedSavingStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

export interface PlannedSaving {
  id: string;
  amount: number;
  date: Date;
  status: PlannedSavingStatus;
  accountId: string;
  budgetId: string;
  plannedIncomeId: string;
  savingGoalId: string;
  account?: { id: string; name: string };
  savingGoal?: { id: string; name: string };
  plannedIncome?: { id: string; amount: number; date: Date };
}
