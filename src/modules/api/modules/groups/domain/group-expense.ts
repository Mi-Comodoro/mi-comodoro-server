export type ExpenseStatus = 'planned' | 'paid' | 'cxp';

export interface GroupExpense {
  id?: string;
  groupId: string;
  description: string;
  amount: number;
  dueDate: Date;
  responsibleUserId: string;
  status: ExpenseStatus;
  transactionId?: string | null;
  cxpId?: string | null;
  cxcId?: string | null;
  nulledAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}
