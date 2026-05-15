import { GenderType, UserProfileType } from './user-profile.types';

export interface UserProfile {
  id?: string;
  userId: string;
  name: string;
  photo?: string;
  phone?: string;
  displayName?: string;
  gender?: GenderType;
  country?: string; // ISO-2 (ej: 'CO')}
  type: UserProfileType;
  trialEndsAt?: Date | undefined;
  isPhoneVerified: boolean;
  phoneVerifiedAt: Date | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserProfileDTO = Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>;
