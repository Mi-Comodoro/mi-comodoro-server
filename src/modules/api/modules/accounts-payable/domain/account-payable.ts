export interface AccountPayable {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  type: 'loan' | 'credit_card' | 'installment' | 'other';
  originalAmount: number;
  currentBalance: number;
  minimumPayment?: number;
  interestRate?: number;
  dueDate?: Date;
  nextPaymentDate?: Date;
  status: 'active' | 'paid' | 'overdue';
  linkedCxcId?: string;
  nulledAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}
