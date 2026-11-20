import { AccountPayableEntity } from '../../database/account-payable.entity';
import { AccountPayableMapper } from '../account-payable.mapper';

const makeEntity = (overrides: Partial<AccountPayableEntity> = {}): AccountPayableEntity => {
  const e = new AccountPayableEntity();
  e.id = 'ap-1';
  e.userId = 'user-1';
  e.name = 'Tarjeta Visa';
  e.description = 'Crédito consumo';
  e.type = 'credit_card';
  e.originalAmount = '5000000' as unknown as number;
  e.currentBalance = '3000000' as unknown as number;
  e.minimumPayment = '150000' as unknown as number;
  e.interestRate = '2.5' as unknown as number;
  e.dueDate = new Date('2024-06-30');
  e.nextPaymentDate = new Date('2024-06-01');
  e.status = 'active';
  (e as unknown as Record<string, unknown>).nulledAt = null;
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-06-01');
  return Object.assign(e, overrides);
};

describe('AccountPayableMapper', () => {
  describe('toDomain', () => {
    it('maps all scalar fields correctly', () => {
      const domain = AccountPayableMapper.toDomain(makeEntity());

      expect(domain.id).toBe('ap-1');
      expect(domain.userId).toBe('user-1');
      expect(domain.name).toBe('Tarjeta Visa');
      expect(domain.type).toBe('credit_card');
      expect(domain.status).toBe('active');
      expect(domain.nulledAt).toBeNull();
    });

    it('converts numeric string amounts to numbers', () => {
      const domain = AccountPayableMapper.toDomain(makeEntity());
      expect(typeof domain.originalAmount).toBe('number');
      expect(typeof domain.currentBalance).toBe('number');
      expect(domain.originalAmount).toBe(5000000);
      expect(domain.currentBalance).toBe(3000000);
    });

    it('maps minimumPayment when present', () => {
      const domain = AccountPayableMapper.toDomain(makeEntity());
      expect(typeof domain.minimumPayment).toBe('number');
      expect(domain.minimumPayment).toBe(150000);
    });

    it('returns undefined minimumPayment when null', () => {
      const domain = AccountPayableMapper.toDomain(
        makeEntity({ minimumPayment: null as unknown as number }),
      );
      expect(domain.minimumPayment).toBeUndefined();
    });

    it('maps interestRate when present', () => {
      const domain = AccountPayableMapper.toDomain(makeEntity());
      expect(domain.interestRate).toBe(2.5);
    });

    it('returns undefined interestRate when null', () => {
      const domain = AccountPayableMapper.toDomain(
        makeEntity({ interestRate: null as unknown as number }),
      );
      expect(domain.interestRate).toBeUndefined();
    });

    it('maps nulledAt when it has a value', () => {
      const date = new Date('2024-05-01');
      const domain = AccountPayableMapper.toDomain(makeEntity({ nulledAt: date }));
      expect(domain.nulledAt).toEqual(date);
    });
  });

  describe('toEntity', () => {
    const baseDomain = {
      userId: 'user-1',
      name: 'Préstamo',
      type: 'loan' as const,
      originalAmount: 1000000,
      currentBalance: 800000,
      status: 'active' as const,
    };

    it('maps required fields onto entity', () => {
      const entity = AccountPayableMapper.toEntity(baseDomain);
      expect(entity).toBeInstanceOf(AccountPayableEntity);
      expect(entity.userId).toBe('user-1');
      expect(entity.name).toBe('Préstamo');
      expect(entity.originalAmount).toBe(1000000);
      expect(entity.status).toBe('active');
    });

    it('does not set id when not provided', () => {
      const entity = AccountPayableMapper.toEntity(baseDomain);
      expect(entity.id).toBeUndefined();
    });

    it('sets id when provided (for updates)', () => {
      const entity = AccountPayableMapper.toEntity({ id: 'ap-99', ...baseDomain });
      expect(entity.id).toBe('ap-99');
    });

    it('maps optional fields when provided', () => {
      const entity = AccountPayableMapper.toEntity({
        ...baseDomain,
        minimumPayment: 50000,
        interestRate: 1.8,
        dueDate: new Date('2024-07-31'),
        nextPaymentDate: new Date('2024-07-01'),
      });
      expect(entity.minimumPayment).toBe(50000);
      expect(entity.interestRate).toBe(1.8);
      expect(entity.dueDate).toEqual(new Date('2024-07-31'));
      expect(entity.nextPaymentDate).toEqual(new Date('2024-07-01'));
    });

    it('sets nulledAt when provided', () => {
      const date = new Date('2024-06-01');
      const entity = AccountPayableMapper.toEntity({ ...baseDomain, nulledAt: date });
      expect(entity.nulledAt).toEqual(date);
    });
  });
});
