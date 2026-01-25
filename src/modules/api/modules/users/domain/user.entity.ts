import { Account } from '../../account/domain/account.entity';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly password: string;
  readonly isActive: boolean;
  readonly account?: Account;
}
