import { FriendshipStatus } from '../../../domain/enums/friendship-status.enum';
import { FriendshipMapper } from '../friendship.mapper';

const makeEntity = (overrides = {}) =>
  ({
    id: 'f-1',
    requesterId: 'user-1',
    addresseeId: 'user-2',
    status: FriendshipStatus.PENDING,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }) as never;

describe('FriendshipMapper', () => {
  describe('toDomain', () => {
    it('maps all fields from entity', () => {
      const result = FriendshipMapper.toDomain(makeEntity());
      expect(result.id).toBe('f-1');
      expect(result.requesterId).toBe('user-1');
      expect(result.addresseeId).toBe('user-2');
      expect(result.status).toBe(FriendshipStatus.PENDING);
    });

    it('maps ACCEPTED status correctly', () => {
      const result = FriendshipMapper.toDomain(makeEntity({ status: FriendshipStatus.ACCEPTED }));
      expect(result.status).toBe(FriendshipStatus.ACCEPTED);
    });

    it('maps BLOCKED status correctly', () => {
      const result = FriendshipMapper.toDomain(makeEntity({ status: FriendshipStatus.BLOCKED }));
      expect(result.status).toBe(FriendshipStatus.BLOCKED);
    });
  });
});
