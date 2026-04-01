import { Finances } from '../../finances/domain/finances';
import { UserProfile } from '../../user-profile/domain/user-profile.entity';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly password: string;
  readonly provider?: string;
  readonly onboarding?: string;
  readonly tokenVersion?: number;
  readonly userProfile?: UserProfile;
  readonly finances?: Finances;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}
