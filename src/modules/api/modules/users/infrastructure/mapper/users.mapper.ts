import { User } from '../../domain/user.entity';

export class UserMapper {
  static toClient(user: User): Omit<User, 'password'> & { createdAt: Date } {
    const data = {
      id: user.id,
      email: user.email,
      provider: user.provider,
      onboarding: user.onboarding,
      timezone: user.timezone,
      userProfile: user.userProfile,
      finances: user.finances,
      createdAt: user.createdAt!,
    };
    return data;
  }
}
