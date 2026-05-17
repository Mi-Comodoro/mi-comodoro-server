export interface TravelExpenseAssignment {
  id?: string;
  expenseId: string;
  userId: string;
  assignedAmount: number;
  settled: boolean;
  nulledAt?: Date | null;
}
