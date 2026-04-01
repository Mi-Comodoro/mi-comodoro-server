import { Account } from '../account';

export interface AccountRepository {
  add(data: Account): Promise<Account>;
  get(userId: string): Promise<Account[]>;
}
