import { User } from '../../users/domain/user.entity';

export type CompoundingFrequency = 'daily' | 'monthly' | 'annually';
export interface Account {
  id?: string;
  name: string;
  description?: string;
  type?: string;
  interestRate: number;
  compoundingFrequency: CompoundingFrequency;
  isActive: boolean;
  isPrimary?: boolean;
  userId: string;
  user?: User;
  createdAt?: Date;
  updatedAt?: Date;
}
