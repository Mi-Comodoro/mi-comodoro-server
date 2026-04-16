// domain/expenses.ts
export enum PlannedExpenseStatus {
  PLANNED = 'PLANNED',
  PAID = 'PAID',
  CANCELED = 'CANCELED',
  SKIPPED = 'SKIPPED',
}

export interface PlannedExpense {
  id?: string;
  budgetId: string;
  categoryId: string;
  name: string;
  expectedAmount: number; // ← tu campo real, no 'amount'
  dueDate: Date; // ← tu campo real, no 'date'
  status: PlannedExpenseStatus; // ← tipado estricto, no string
  isEssential: boolean;
  notes?: string;
  billsId?: string | null;
  accountId?: string; // ← nuevo, opcional por ahora
  createdAt?: Date;
  updatedAt?: Date;
}
export interface GetPlannedExpensesDto {
  budgetId: string;

  search?: string;
  status?: ('PLANNED' | 'PAID' | 'CANCELED' | 'SKIPPED')[];
  bucket?: ('needs' | 'wants')[];
  categoryIds?: string[];

  fromDate?: Date;
  toDate?: Date;

  minAmount?: number;
  maxAmount?: number;

  isFromBill?: boolean;

  page?: number;
  limit?: number;
}
