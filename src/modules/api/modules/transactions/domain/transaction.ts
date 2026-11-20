export interface Transaction {
  id?: string;
  amount: number;
  source: string;
  description?: string;

  // IDs directos
  userId: string;
  budgetId: string;
  categoryId?: string;
  billId?: string;
  plannedExpenseId?: string;
  plannedIncomeId?: string;
  plannedSavingId?: string;
  accountId?: string; // ← faltaba, lo usás en savings
  savingGoalId?: string;

  // Trazabilidad de movimiento entre cuentas
  fromAccountId?: string; // Cuenta origen del movimiento
  toAccountId?: string; // Cuenta destino del movimiento

  // tipo
  type: 'income' | 'expense' | 'savings' | 'interest';

  // relaciones enriquecidas opcionales (para vistas)
  category?: { id: string; name: string };
  account?: { id: string; name: string };
  fromAccount?: { id: string; name: string };
  toAccount?: { id: string; name: string };

  // fechas
  transactionDate: Date;
  nulledAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
export interface TransactionFilters {
  type?: 'income' | 'expense' | 'savings' | 'interest';
  categoryId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  includeCategory?: boolean;
}

export interface TransactionPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
