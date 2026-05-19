export interface Settings {
  readonly id: string;
  readonly userId: string;
  readonly currency: string;
  readonly language: string;
  readonly notificationsEnabled: boolean;
  readonly budgetAlertThreshold: number;
  readonly savingsPercentage: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}
