export type SplitType = 'EQUAL' | 'CUSTOM' | 'PERCENTAGE';

export interface TravelExpense {
  id?: string;
  groupId: string;
  paidBy: string;
  description: string;
  amount: number;
  expenseDate: Date;
  splitType: SplitType;
  nulledAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}
