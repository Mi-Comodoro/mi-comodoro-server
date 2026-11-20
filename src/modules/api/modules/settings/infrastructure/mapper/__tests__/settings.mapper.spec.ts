import { SettingsMapper } from '../settings.mapper';

const makeEntity = (overrides = {}) =>
  ({
    id: 'settings-1',
    userId: 'user-1',
    currency: 'COP',
    language: 'es',
    notificationsEnabled: true,
    budgetAlertThreshold: 80,
    savingsPercentage: '20.5',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }) as never;

describe('SettingsMapper', () => {
  describe('toDomain', () => {
    it('maps all fields from entity', () => {
      const result = SettingsMapper.toDomain(makeEntity());
      expect(result.id).toBe('settings-1');
      expect(result.userId).toBe('user-1');
      expect(result.currency).toBe('COP');
      expect(result.language).toBe('es');
      expect(result.notificationsEnabled).toBe(true);
      expect(result.budgetAlertThreshold).toBe(80);
    });

    it('converts savingsPercentage string to number', () => {
      const result = SettingsMapper.toDomain(makeEntity({ savingsPercentage: '15.75' }));
      expect(result.savingsPercentage).toBe(15.75);
    });
  });
});
