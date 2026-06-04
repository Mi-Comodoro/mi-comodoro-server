import { BillMapper } from '../bill.mapper';

const makeEntity = (overrides = {}) =>
  ({
    id: 'bill-1',
    userId: 'user-1',
    categoryId: 'cat-1',
    name: 'Netflix',
    expectedAmount: '49900',
    billingDay: 15,
    frequency: 'monthly',
    isActive: true,
    isPaid: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }) as never;

describe('BillMapper', () => {
  describe('toDomain', () => {
    it('maps all fields from entity', () => {
      const result = BillMapper.toDomain(makeEntity());
      expect(result.id).toBe('bill-1');
      expect(result.userId).toBe('user-1');
      expect(result.name).toBe('Netflix');
      expect(result.billingDay).toBe(15);
      expect(result.isActive).toBe(true);
    });

    it('converts expectedAmount string to number', () => {
      const result = BillMapper.toDomain(makeEntity({ expectedAmount: '49900.50' }));
      expect(result.expectedAmount).toBe(49900.5);
    });
  });

  describe('toEntity', () => {
    it('maps all provided fields', () => {
      const data = {
        userId: 'user-1',
        name: 'Spotify',
        expectedAmount: 15000,
        billingDay: 5,
        frequency: 'monthly',
        isActive: true,
        isPaid: false,
        categoryId: 'cat-2',
      };
      const entity = BillMapper.toEntity(data as never);
      expect(entity.userId).toBe('user-1');
      expect(entity.name).toBe('Spotify');
      expect(entity.expectedAmount).toBe(15000);
    });

    it('does not set fields that are undefined', () => {
      const entity = BillMapper.toEntity({});
      expect(entity.name).toBeUndefined();
      expect(entity.userId).toBeUndefined();
    });
  });
});
