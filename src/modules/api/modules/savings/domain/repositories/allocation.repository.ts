import { SavingAllocation } from '../savings-allocations';

export interface SavingAllocationRepository {
  create(data: SavingAllocation): Promise<SavingAllocation>;
  find(budgetId: string): Promise<SavingAllocation[]>;
  replaceForBudget(
    budgetId: string,
    data: Omit<SavingAllocation, 'id' | 'createdAt' | 'updatedAt'>[],
  ): Promise<SavingAllocation[]>;
}
