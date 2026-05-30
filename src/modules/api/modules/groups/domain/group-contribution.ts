export interface GroupContribution {
  id?: string;
  groupId: string;
  userId: string;
  amount: number;
  budgetId?: string | null;
  budgetLabel?: string | null;
  nulledAt?: Date | null;
  createdAt?: Date;
}
