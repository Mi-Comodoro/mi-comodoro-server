import { AccountType } from '@/common/enums/account-type.enum';

import { GenderType } from './user-profile.types';

export interface UserProfile {
  id?: string;
  userId: string;
  name: string;
  photo?: string;
  phone?: string;
  displayName?: string;
  gender?: GenderType;
  country?: string; // ISO-2 (ej: 'CO')}
  accountType: AccountType;
  trialEndsAt?: Date | null;
  isPhoneVerified: boolean;
  phoneVerifiedAt: Date | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserProfileDTO = Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>;
