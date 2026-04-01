import { Budget, FinancialStrategyType } from '../../budgets/domain/budget';
import { IncomeFrequency } from '../../incomes/domain/incomes';
import { GenderType } from '../../user-profile/domain/user-profile.types';

export interface OnboardingUserInfo {
  email: string;
  displayName: string;
  gender: GenderType;
  phone?: string;
}

export interface OnboardingFinancesData {
  profile: string;
  usage: string;
  currency: string;
}

export interface OnboardingBudgetData {
  needs: number;
  wants: number;
  savings: number;
  strategy: FinancialStrategyType;
  budgetFrequency: string;
}

export interface OnboardingIncomeData {
  userId: string;
  source: string;
  amount: number;
  paymentDays: number[];
  frequency: IncomeFrequency;
  isActive: boolean;
}

export interface OnboardingPayload {
  userId: string;
  data: {
    userInfo: OnboardingUserInfo;
    finances: OnboardingFinancesData;
    budget: OnboardingBudgetData;
    incomes: OnboardingIncomeData[];
  };
  budget?: Budget;
}

export interface OnboardingFinancesPayload extends OnboardingPayload {
  financesId?: string;
}

export interface OnboardingErrorPayload {
  userId?: string;
  email?: string;
  step?: string;
  error?: Error | string;
}
