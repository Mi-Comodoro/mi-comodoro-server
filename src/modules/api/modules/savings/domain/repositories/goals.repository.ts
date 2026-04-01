import { SavingGoal } from '../savings-goals';

export interface GoalsRepository {
  create(data: SavingGoal): Promise<SavingGoal>;
  find(userId: string): Promise<SavingGoal[]>;
}
