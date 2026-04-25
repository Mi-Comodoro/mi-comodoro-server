import { FinancialStrategyType } from '../../../budgets/domain/budget';
import { IncomeFrequency } from '../../../incomes/domain/incomes';
import { FinancialProfileEnum } from '../../../shared/enum/enum';
import { GenderType } from '../../../user-profile/domain/user-profile.types';

export interface CreateUser {
  email: string;
  passwordHash: string;
}

export type UserInfo = {
  displayName: string;
  email: string;
  phone: string;
  gender: GenderType;
};
export type FinancesInfo = {
  currency: string;
  profile: FinancialProfileEnum;
  monthPayment: string | null;
  biweeklyPayments: [string, string];
  accountName: string;
  interestRate: number;
};
export type BudgetInfo = {
  strategy: FinancialStrategyType;
  needs: number;
  wants: number;
  savings: number;
  budgetFrequency: IncomeFrequency;
  usage: string;
};

export type Incomes = {
  source: string;
  amount: number;
  isAdditional: boolean;
};
export type OnboardingData = {
  userInfo: UserInfo;
  finances: FinancesInfo;
  budget: BudgetInfo;
  incomes: {
    incomes: Incomes[];
    paymentDates: string | [string, string] | null;
    frequency: IncomeFrequency | null;
  };
};
