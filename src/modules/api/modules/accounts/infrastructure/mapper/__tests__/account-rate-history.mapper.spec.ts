import { AccountRateHistoryEntity } from '../../database/account-rate-history.entity';
import { AccountRateHistoryMapper } from '../account-rate-history.mapper';

const makeEntity = (
  overrides: Partial<AccountRateHistoryEntity> = {},
): AccountRateHistoryEntity => {
  const e = new AccountRateHistoryEntity();
  e.id = 'arh-1';
  e.accountId = 'acc-1';
  e.previousRate = '5.5' as unknown as number;
  e.newRate = '7.25' as unknown as number;
  e.changedAt = new Date('2024-06-15T09:00:00Z');
  e.createdAt = new Date('2024-06-15T09:00:00Z');
  return Object.assign(e, overrides);
};

describe('AccountRateHistoryMapper', () => {
  describe('toDomain', () => {
    it('maps all fields correctly', () => {
      const domain = AccountRateHistoryMapper.toDomain(makeEntity());

      expect(domain.id).toBe('arh-1');
      expect(domain.accountId).toBe('acc-1');
      expect(domain.changedAt).toEqual(new Date('2024-06-15T09:00:00Z'));
    });

    it('converts previousRate DB string to number', () => {
      const domain = AccountRateHistoryMapper.toDomain(makeEntity());
      expect(typeof domain.previousRate).toBe('number');
      expect(domain.previousRate).toBe(5.5);
    });

    it('converts newRate DB string to number', () => {
      const domain = AccountRateHistoryMapper.toDomain(makeEntity());
      expect(typeof domain.newRate).toBe('number');
      expect(domain.newRate).toBe(7.25);
    });

    it('converts zero rates to 0', () => {
      const domain = AccountRateHistoryMapper.toDomain(
        makeEntity({ previousRate: '0' as unknown as number, newRate: '0' as unknown as number }),
      );
      expect(domain.previousRate).toBe(0);
      expect(domain.newRate).toBe(0);
    });
  });

  describe('toEntity', () => {
    const baseDomain = {
      accountId: 'acc-1',
      previousRate: 5.5,
      newRate: 7.25,
      changedAt: new Date('2024-06-15'),
    };

    it('maps all fields onto the partial entity', () => {
      const partial = AccountRateHistoryMapper.toEntity(baseDomain);

      expect(partial.accountId).toBe('acc-1');
      expect(partial.previousRate).toBe(5.5);
      expect(partial.newRate).toBe(7.25);
      expect(partial.changedAt).toEqual(new Date('2024-06-15'));
    });

    it('does not include id or createdAt in the result', () => {
      const partial = AccountRateHistoryMapper.toEntity(baseDomain);
      expect('id' in partial).toBe(false);
      expect('createdAt' in partial).toBe(false);
    });
  });
});
