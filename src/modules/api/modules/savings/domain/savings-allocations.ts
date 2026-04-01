import { SavingGoal } from './savings-goals';

export interface SavingAllocation {
  id?: string;
  goalId: string;
  percentage: number;
  budgetId: string;
  createdAt?: Date;
  updatedAt?: Date;
  goal?: SavingGoal;
}
