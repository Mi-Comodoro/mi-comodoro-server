import { User } from '../../users/domain/user.entity';

export type CompoundingFrequency = 'daily' | 'monthly' | 'annually';
export interface Account {
  id?: string;
  name: string;
  description?: string;
  interestRate: number;
  compoundingFrequency: CompoundingFrequency;
  isActive: boolean;
  userId: string;
  user?: User;
  createdAt?: Date;
  updatedAt?: Date;
}
