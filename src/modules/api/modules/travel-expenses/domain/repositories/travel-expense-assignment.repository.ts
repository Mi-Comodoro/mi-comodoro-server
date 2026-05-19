import type { TravelExpenseAssignment } from '../travel-expense-assignment';

export interface TravelExpenseAssignmentRepository {
  saveMany(assignments: Partial<TravelExpenseAssignment>[]): Promise<TravelExpenseAssignment[]>;
  findByExpense(expenseId: string): Promise<TravelExpenseAssignment[]>;
  findByExpenseAndUser(expenseId: string, userId: string): Promise<TravelExpenseAssignment | null>;
  deleteByExpense(expenseId: string): Promise<void>;
  settle(id: string): Promise<void>;
}
