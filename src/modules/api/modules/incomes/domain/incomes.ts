import { User } from '../../users/domain/user.entity';
export type IncomeFrequency = 'monthly' | 'biweekly';
export interface IncomeSource {
  id?: string;
  userId: string;
  user?: User;
  source: string;
  amount: number;
  paymentDays: number[]; // Días del mes en que se recibe el ingreso
  frequency: IncomeFrequency;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CreateIncomeSourceDTO = Omit<IncomeSource, 'user'>;
export type UpdateIncomeSourceDTO = Partial<Omit<CreateIncomeSourceDTO, 'id'>>;
