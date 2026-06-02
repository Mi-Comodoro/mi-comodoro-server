export type FinancialStrategyType = 'BALANCED' | 'CUSTOM';
export type BudgetStatus = 'ACTIVE' | 'CLOSED' | 'PLANNED';
export interface Budget {
  readonly id?: string;
  readonly name: string;
  readonly month: string;
  readonly year: number;
  readonly isShared: boolean;
  readonly needsLimit: number;
  readonly wantsLimit: number;
  readonly savingsLimit: number;
  readonly financesId: string;
  readonly ownerId: string;
  readonly partnerId?: string;
  readonly updatedBy?: string;
  readonly strategy: FinancialStrategyType;
  readonly frequency: string;
  readonly status: BudgetStatus;
  readonly currency?: string;
  readonly carryForwardAmount?: number;
  readonly isDefault?: boolean;
  readonly closedAt?: Date | null;
  readonly nulledAt?: Date | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}
