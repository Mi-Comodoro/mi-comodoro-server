export interface Transaction {
  id?: string;
  amount: number;
  source: string;
  description?: string;
  userId: string;
  budgetId: string;
  categoryId: string;
  type: 'income' | 'expense' | 'savings';
  category?: { id: string; name: string };
  transactionDate: Date;
  nulledAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
