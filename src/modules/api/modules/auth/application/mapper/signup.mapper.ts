import { UserProfile } from '../../../user-profile/domain/user-profile.entity';
import { User } from '../../../users/domain/user.entity';

export const signUpToClient = (user: User, userProfile: UserProfile) => {
  return {
    id: user.id,
    email: user.email,
    userProfile: {
      id: userProfile.id,
      name: userProfile.name,
      displayName: userProfile.displayName,
      gender: userProfile.gender,
      country: userProfile.country,
      isActive: userProfile.isActive,
    },
  };
};
