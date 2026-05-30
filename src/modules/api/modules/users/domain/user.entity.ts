import { Finances } from '../../finances/domain/finances';
import { UserProfile } from '../../user-profile/domain/user-profile.entity';
import { UserRole } from './user-role.enum';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly password: string;
  readonly provider?: string;
  readonly onboarding?: string;
  readonly tokenVersion?: number;
  readonly role?: UserRole;
  readonly userProfile?: UserProfile;
  readonly finances?: Finances;
  readonly handle?: string | null;
  readonly nulledAt?: Date | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}
