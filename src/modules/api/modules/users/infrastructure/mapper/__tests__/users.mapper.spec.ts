import { User } from '../../../domain/user.entity';
import { UserMapper } from '../users.mapper';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-1',
    email: 'user@test.com',
    provider: 'LOCAL' as const,
    onboarding: 'COMPLETED' as never,
    timezone: 'America/Bogota',
    password: '$argon2id$secret',
    userProfile: { id: 'profile-1', name: 'Test User' } as never,
    finances: undefined,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  }) as User;

describe('UserMapper', () => {
  describe('toClient', () => {
    it('returns all expected fields', () => {
      const user = makeUser();
      const client = UserMapper.toClient(user);

      expect(client.id).toBe('user-1');
      expect(client.email).toBe('user@test.com');
      expect(client.provider).toBe('LOCAL');
      expect(client.onboarding).toBe('COMPLETED');
      expect(client.timezone).toBe('America/Bogota');
      expect(client.createdAt).toEqual(new Date('2024-01-01'));
    });

    it('does not include password in the result', () => {
      const user = makeUser();
      const client = UserMapper.toClient(user);
      expect((client as Record<string, unknown>).password).toBeUndefined();
    });

    it('includes userProfile when present', () => {
      const user = makeUser();
      const client = UserMapper.toClient(user);
      expect((client.userProfile as unknown as Record<string, unknown>).id).toBe('profile-1');
    });

    it('includes finances when present', () => {
      const user = makeUser({ finances: { id: 'fin-1' } as never });
      const client = UserMapper.toClient(user);
      expect((client.finances as unknown as Record<string, unknown>)?.id).toBe('fin-1');
    });
  });
});
