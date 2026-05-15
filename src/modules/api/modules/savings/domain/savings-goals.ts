import { Account } from '../../accounts/domain/account';
import { User } from '../../users/domain/user.entity';

export enum GoalStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
}

export interface SavingGoal {
  id?: string;
  name: string;
  reason: string;
  targetAmount?: number;
  targetDate?: Date;
  isActive: boolean;
  status?: GoalStatus;
  userId?: string;
  accountId: string;
  lastInterestDate?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  nulledAt?: Date | null;
  user?: User;
  account?: Account;
}
