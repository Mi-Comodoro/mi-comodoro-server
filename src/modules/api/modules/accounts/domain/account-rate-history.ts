export interface AccountRateHistory {
  id: string;
  accountId: string;
  previousRate: number;
  newRate: number;
  changedAt: Date;
  createdAt: Date;
}
