import { FinancialProfileType, GenderType, UsageType } from '../../../account/domain/account.types';

export interface CreateUserAccount {
  email: string;
  passwordHash: string;
  name: string;
  displayName?: string;
  gender?: GenderType;
  country?: string;
  usageType?: UsageType;
  financialProfile?: FinancialProfileType;
}
