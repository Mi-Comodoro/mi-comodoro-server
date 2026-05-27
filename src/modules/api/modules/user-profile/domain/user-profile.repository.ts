import { UserProfile } from './user-profile.entity';

export interface UserProfileRepository {
  save(userProfile: UserProfile): Promise<UserProfile>;
  findById(id: string): Promise<UserProfile | null>;
  findByUserId(userId: string): Promise<UserProfile | null>;
  update(userId: string, userProfile: UserProfile): Promise<UserProfile>;
  existsByPhone(phone: string): Promise<boolean>;
}
