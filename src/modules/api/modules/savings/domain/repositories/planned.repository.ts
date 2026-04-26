import { PlannedSaving } from '../savings-planned';

export interface PlannedSavingRepository {
  save(domain: Partial<PlannedSaving>): Promise<PlannedSaving>;
  saveMany(domain: Partial<PlannedSaving>[]): Promise<PlannedSaving[]>;
  findById(id: string): Promise<PlannedSaving | null>;
  findByBudget(budgetId: string): Promise<PlannedSaving[]>;
  findByGoalId(goalId: string): Promise<PlannedSaving[]>;
  update(id: string, domain: Partial<PlannedSaving>): Promise<PlannedSaving | null>;
}
