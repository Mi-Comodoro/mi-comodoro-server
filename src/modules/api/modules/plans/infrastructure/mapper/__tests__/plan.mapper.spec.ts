import { PlanMapper } from '../plan.mapper';

const makeEntity = (overrides = {}) =>
  ({
    id: 'plan-1',
    name: 'Basic',
    price: '0',
    currency: 'COP',
    features: ['feature1', 'feature2'],
    isActive: true,
    isPublic: true,
    nulledAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }) as never;

describe('PlanMapper', () => {
  describe('toDomain', () => {
    it('maps all fields from entity', () => {
      const result = PlanMapper.toDomain(makeEntity());
      expect(result.id).toBe('plan-1');
      expect(result.name).toBe('Basic');
      expect(result.currency).toBe('COP');
      expect(result.features).toEqual(['feature1', 'feature2']);
      expect(result.isActive).toBe(true);
    });

    it('converts price string to number', () => {
      const result = PlanMapper.toDomain(makeEntity({ price: '9900.50' }));
      expect(result.price).toBe(9900.5);
    });
  });

  describe('toEntity', () => {
    it('maps all provided fields', () => {
      const data = {
        name: 'Pro',
        price: 29900,
        currency: 'COP',
        features: ['f1'],
        isActive: true,
        isPublic: false,
      };
      const entity = PlanMapper.toEntity(data);
      expect(entity.name).toBe('Pro');
      expect(entity.price).toBe(29900);
      expect(entity.isPublic).toBe(false);
    });

    it('does not set fields that are undefined', () => {
      const entity = PlanMapper.toEntity({});
      expect(entity.name).toBeUndefined();
    });
  });
});
