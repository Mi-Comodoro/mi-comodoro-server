import { GenderType } from '../../../user-profile/domain/user-profile.types';

export interface CreateUserProfile {
  email: string;
  passwordHash: string;
  name: string;
  displayName?: string;
  gender?: GenderType;
  country?: string;
  plan?: string;
}
