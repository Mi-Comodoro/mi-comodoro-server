import { AccountReceivableEntity } from '../../database/account-receivable.entity';
import { AccountReceivableMapper } from '../account-receivable.mapper';

const makeEntity = (overrides: Partial<AccountReceivableEntity> = {}): AccountReceivableEntity => {
  const e = new AccountReceivableEntity();
  e.id = 'ar-1';
  e.userId = 'user-1';
  e.name = 'Préstamo a Juan';
  e.description = 'Préstamo personal';
  e.debtor = 'Juan Pérez';
  e.originalAmount = '2000000' as unknown as number;
  e.currentBalance = '1500000' as unknown as number;
  e.dueDate = new Date('2024-12-31');
  e.status = 'pending';
  e.linkedCxpId = undefined;
  (e as unknown as Record<string, unknown>).nulledAt = null;
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-06-01');
  return Object.assign(e, overrides);
};

describe('AccountReceivableMapper', () => {
  describe('toDomain', () => {
    it('maps all scalar fields correctly', () => {
      const domain = AccountReceivableMapper.toDomain(makeEntity());

      expect(domain.id).toBe('ar-1');
      expect(domain.userId).toBe('user-1');
      expect(domain.name).toBe('Préstamo a Juan');
      expect(domain.debtor).toBe('Juan Pérez');
      expect(domain.status).toBe('pending');
      expect(domain.nulledAt).toBeNull();
    });

    it('converts originalAmount DB string to number', () => {
      const domain = AccountReceivableMapper.toDomain(makeEntity());
      expect(typeof domain.originalAmount).toBe('number');
      expect(domain.originalAmount).toBe(2000000);
    });

    it('converts currentBalance DB string to number', () => {
      const domain = AccountReceivableMapper.toDomain(makeEntity());
      expect(typeof domain.currentBalance).toBe('number');
      expect(domain.currentBalance).toBe(1500000);
    });

    it('maps nulledAt when it has a value', () => {
      const date = new Date('2024-05-01');
      const domain = AccountReceivableMapper.toDomain(makeEntity({ nulledAt: date }));
      expect(domain.nulledAt).toEqual(date);
    });

    it('maps linkedCxpId when present', () => {
      const domain = AccountReceivableMapper.toDomain(makeEntity({ linkedCxpId: 'cxp-1' }));
      expect(domain.linkedCxpId).toBe('cxp-1');
    });
  });

  describe('toEntity', () => {
    const baseDomain = {
      userId: 'user-1',
      name: 'Deuda de Pedro',
      debtor: 'Pedro López',
      originalAmount: 500000,
      currentBalance: 500000,
      status: 'pending' as const,
    };

    it('maps required fields onto entity', () => {
      const entity = AccountReceivableMapper.toEntity(baseDomain);

      expect(entity).toBeInstanceOf(AccountReceivableEntity);
      expect(entity.userId).toBe('user-1');
      expect(entity.name).toBe('Deuda de Pedro');
      expect(entity.debtor).toBe('Pedro López');
      expect(entity.originalAmount).toBe(500000);
      expect(entity.status).toBe('pending');
    });

    it('does not set id when not provided', () => {
      const entity = AccountReceivableMapper.toEntity(baseDomain);
      expect(entity.id).toBeUndefined();
    });

    it('sets id when provided (for updates)', () => {
      const entity = AccountReceivableMapper.toEntity({ id: 'ar-99', ...baseDomain });
      expect(entity.id).toBe('ar-99');
    });

    it('maps nulledAt when provided', () => {
      const date = new Date('2024-06-30');
      const entity = AccountReceivableMapper.toEntity({ ...baseDomain, nulledAt: date });
      expect(entity.nulledAt).toEqual(date);
    });

    it('sets nulledAt to null when not provided (default)', () => {
      const entity = AccountReceivableMapper.toEntity(baseDomain);
      expect(entity.nulledAt).toBeNull();
    });
  });
});
