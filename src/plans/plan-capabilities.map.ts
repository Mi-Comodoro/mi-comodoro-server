import { AccountType } from '../common/enums/account-type.enum';

export interface PlanCapabilities {
  maxBudgets: number;
  sharedBudgets: number;
  historicMonths: number;
  exportEnabled: boolean;
  customCategories: boolean;
}

export const PLAN_CAPABILITIES: Record<AccountType, PlanCapabilities> = {
  [AccountType.TRIAL]: {
    maxBudgets: -1,
    sharedBudgets: 6,
    historicMonths: -1,
    exportEnabled: true,
    customCategories: true,
  },
  [AccountType.FREE]: {
    maxBudgets: 1,
    sharedBudgets: 0,
    historicMonths: 6,
    exportEnabled: false,
    customCategories: false,
  },
  [AccountType.PLUS]: {
    maxBudgets: 3,
    sharedBudgets: 2,
    historicMonths: 18,
    exportEnabled: true,
    customCategories: true,
  },
  [AccountType.PRO]: {
    maxBudgets: -1,
    sharedBudgets: 6,
    historicMonths: -1,
    exportEnabled: true,
    customCategories: true,
  },
  [AccountType.PARTNER]: {
    maxBudgets: -1,
    sharedBudgets: 6,
    historicMonths: -1,
    exportEnabled: true,
    customCategories: true,
  },
};
