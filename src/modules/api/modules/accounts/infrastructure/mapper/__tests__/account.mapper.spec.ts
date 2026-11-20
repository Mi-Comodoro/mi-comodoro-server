import { AccountEntity } from '../../database/account.entity';
import { AccountMapper } from '../account.mapper';

const makeEntity = (overrides: Partial<AccountEntity> = {}): AccountEntity => {
  const e = new AccountEntity();
  e.id = 'acc-1';
  e.name = 'Bancolombia';
  e.description = 'Cuenta de ahorros';
  e.type = 'savings';
  e.interestRate = 5.5 as unknown as number;
  e.compoundingFrequency = 'monthly';
  e.isActive = true;
  e.isPrimary = false;
  e.userId = 'user-1';
  return Object.assign(e, overrides);
};

describe('AccountMapper', () => {
  describe('toDomain', () => {
    it('maps all scalar fields correctly', () => {
      const domain = AccountMapper.toDomain(makeEntity());

      expect(domain.id).toBe('acc-1');
      expect(domain.name).toBe('Bancolombia');
      expect(domain.description).toBe('Cuenta de ahorros');
      expect(domain.type).toBe('savings');
      expect(domain.compoundingFrequency).toBe('monthly');
      expect(domain.isActive).toBe(true);
      expect(domain.isPrimary).toBe(false);
      expect(domain.userId).toBe('user-1');
    });

    it('converts interestRate DB string to a number', () => {
      const domain = AccountMapper.toDomain(
        makeEntity({ interestRate: '7.25' as unknown as number }),
      );
      expect(typeof domain.interestRate).toBe('number');
      expect(domain.interestRate).toBe(7.25);
    });

    it('converts interestRate "0" to 0', () => {
      const domain = AccountMapper.toDomain(makeEntity({ interestRate: '0' as unknown as number }));
      expect(domain.interestRate).toBe(0);
    });

    it('maps isPrimary true correctly', () => {
      const domain = AccountMapper.toDomain(makeEntity({ isPrimary: true }));
      expect(domain.isPrimary).toBe(true);
    });
  });
});
