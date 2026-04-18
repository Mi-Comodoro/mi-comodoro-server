import { Account } from '../../accounts/domain/account';
import { User } from '../../users/domain/user.entity';

export interface SavingGoal {
  id?: string;
  name: string;
  reason: string;
  targetAmount?: number;
  targetDate?: Date;
  isActive: boolean;
  userId?: string;
  accountId: string;
  createdAt?: Date;
  updatedAt?: Date;
  user?: User;
  account?: Account;
}
