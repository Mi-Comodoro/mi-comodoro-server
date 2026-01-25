import { AccountType, FinancialProfileType, GenderType, UsageType } from './account.types';

export interface Account {
  id?: string;
  userId: string;
  name: string;
  displayName?: string;
  gender?: GenderType;
  country?: string; // ISO-2 (ej: 'CO')
  usageType?: UsageType;
  financialProfile?: FinancialProfileType;
  type: AccountType;
  trialEndsAt?: Date | undefined;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
