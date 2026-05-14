import { UserRole } from '@/modules/api/modules/users/domain/user-role.enum';

export interface JwtPayload {
  userId: string;
  email: string;
  role?: UserRole;
  userProfileId?: string;
  tokenVersion?: number;
}
