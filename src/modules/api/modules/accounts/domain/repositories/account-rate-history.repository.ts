import { AccountRateHistory } from '../account-rate-history';

export interface AccountRateHistoryRepository {
  save(data: Omit<AccountRateHistory, 'id' | 'createdAt'>): Promise<AccountRateHistory>;
  findByAccount(accountId: string): Promise<AccountRateHistory[]>;
}
