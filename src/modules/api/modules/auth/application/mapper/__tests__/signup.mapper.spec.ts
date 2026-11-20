import { signUpToClient } from '../signup.mapper';

describe('signUpToClient', () => {
  const user = {
    id: 'user-1',
    email: 'user@test.com',
    password: '$argon2id$secret',
  };

  const userProfile = {
    id: 'profile-1',
    name: 'Test User',
    displayName: 'Tester',
    gender: 'M',
    country: 'CO',
    isActive: true,
  };

  it('returns id and email from user', () => {
    const result = signUpToClient(user as never, userProfile as never);
    expect(result.id).toBe('user-1');
    expect(result.email).toBe('user@test.com');
  });

  it('does not include password in the result', () => {
    const result = signUpToClient(user as never, userProfile as never);
    expect((result as Record<string, unknown>).password).toBeUndefined();
  });

  it('includes userProfile with expected fields', () => {
    const result = signUpToClient(user as never, userProfile as never);
    expect(result.userProfile.id).toBe('profile-1');
    expect(result.userProfile.name).toBe('Test User');
    expect(result.userProfile.displayName).toBe('Tester');
    expect(result.userProfile.gender).toBe('M');
    expect(result.userProfile.country).toBe('CO');
    expect(result.userProfile.isActive).toBe(true);
  });

  it('does not expose extra profile fields not in the mapping', () => {
    const extendedProfile = { ...userProfile, privateField: 'secret' };
    const result = signUpToClient(user as never, extendedProfile as never);
    expect((result.userProfile as Record<string, unknown>).privateField).toBeUndefined();
  });
});
