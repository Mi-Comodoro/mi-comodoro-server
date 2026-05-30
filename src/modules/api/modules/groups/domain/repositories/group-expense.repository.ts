import type { GroupExpense } from '../group-expense';

export interface GroupExpenseRepository {
  findByGroup(groupId: string): Promise<GroupExpense[]>;
  findById(id: string): Promise<GroupExpense | null>;
  save(expense: Partial<GroupExpense>): Promise<GroupExpense>;
  updateStatus(
    id: string,
    status: GroupExpense['status'],
    extra?: { transactionId?: string; cxpId?: string },
  ): Promise<GroupExpense>;
  softDelete(id: string): Promise<void>;
}
