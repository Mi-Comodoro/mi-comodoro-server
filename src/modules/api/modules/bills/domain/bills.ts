export type BillFrequency = 'monthly' | 'yearly';

export interface Bill {
  id?: string;
  userId: string;
  categoryId: string;
  name: string;
  expectedAmount: number;
  billingDay: number;
  frequency: BillFrequency;
  isActive: boolean;
  isPaid: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
