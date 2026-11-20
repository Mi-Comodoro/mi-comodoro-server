export interface AccountReceivable {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  debtor?: string;
  originalAmount: number;
  currentBalance: number;
  dueDate?: Date;
  status: 'pending' | 'partial' | 'collected' | 'overdue';
  linkedCxpId?: string;
  nulledAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}
