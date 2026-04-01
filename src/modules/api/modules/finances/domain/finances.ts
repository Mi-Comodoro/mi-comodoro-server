export type FinancialProfileType = 'employee' | 'freelancer' | 'business_owner';

export interface Finances {
  id?: string;
  userId: string;
  profile: FinancialProfileType;
  currency: string;
  createdAt?: Date;
  updatedAt?: Date;
}
