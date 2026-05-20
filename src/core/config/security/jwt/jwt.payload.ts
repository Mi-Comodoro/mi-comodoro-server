import { AccountType } from '@/common/enums/account-type.enum';
import { UserRole } from '@/modules/api/modules/users/domain/user-role.enum';

export interface JwtPayload {
  userId: string;
  email: string;
  role?: UserRole;
  accountType?: AccountType;
  userProfileId?: string;
  tokenVersion?: number;
}
