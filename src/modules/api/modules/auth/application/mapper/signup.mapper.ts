import { Account } from '../../../account/domain/account.entity';
import { User } from '../../../users/domain/user.entity';

export const signUpToClient = (user: User, account: Account) => {
  return {
    id: user.id,
    email: user.email,
    isActive: user.isActive,
    account: {
      id: account.id,
      name: account.name,
      displayName: account.displayName,
      gender: account.gender,
      country: account.country,
      usageType: account.usageType,
      financialProfile: account.financialProfile,
      isActive: account.isActive,
    },
  };
};
