import { Account } from './account.entity';

export interface AccountRepository {
  save(account: Account): Promise<Account>;
  findById(id: string): Promise<Account | null>;
}
