import { GoalStatus } from '../../../domain/savings-goals';
import { SavingGoalEntity } from '../../database/entities/saving-goals.entity';
import { SavingsGoalsMapper } from '../goals.mapper';

const makeEntity = (overrides: Partial<SavingGoalEntity> = {}): SavingGoalEntity => {
  const e = new SavingGoalEntity();
  e.id = 'goal-1';
  e.userId = 'user-1';
  e.name = 'Vacaciones';
  e.reason = 'Viaje Europa';
  e.targetAmount = '5000000' as unknown as number;
  e.targetDate = new Date('2025-12-01');
  e.isActive = true;
  e.status = GoalStatus.SCHEDULED;
  e.accountId = 'acc-1';
  (e as unknown as Record<string, unknown>).account = undefined;
  (e as unknown as Record<string, unknown>).lastInterestDate = null;
  (e as unknown as Record<string, unknown>).nulledAt = null;
  e.updatedAt = new Date('2024-06-01');
  return Object.assign(e, overrides);
};

describe('SavingsGoalsMapper', () => {
  describe('toDomain', () => {
    it('maps all scalar fields correctly', () => {
      const domain = SavingsGoalsMapper.toDomain(makeEntity());

      expect(domain.id).toBe('goal-1');
      expect(domain.userId).toBe('user-1');
      expect(domain.name).toBe('Vacaciones');
      expect(domain.reason).toBe('Viaje Europa');
      expect(domain.isActive).toBe(true);
      expect(domain.status).toBe(GoalStatus.SCHEDULED);
      expect(domain.accountId).toBe('acc-1');
    });

    it('converts targetAmount DB string to number', () => {
      const domain = SavingsGoalsMapper.toDomain(
        makeEntity({ targetAmount: '1500000' as unknown as number }),
      );
      expect(typeof domain.targetAmount).toBe('number');
      expect(domain.targetAmount).toBe(1500000);
    });

    it('returns undefined targetAmount when null', () => {
      const domain = SavingsGoalsMapper.toDomain(
        makeEntity({ targetAmount: null as unknown as number }),
      );
      expect(domain.targetAmount).toBeUndefined();
    });

    it('maps targetDate when present', () => {
      const date = new Date('2025-06-30');
      const domain = SavingsGoalsMapper.toDomain(makeEntity({ targetDate: date }));
      expect(domain.targetDate).toEqual(date);
    });

    it('returns undefined targetDate when null', () => {
      const domain = SavingsGoalsMapper.toDomain(
        makeEntity({ targetDate: null as unknown as Date }),
      );
      expect(domain.targetDate).toBeUndefined();
    });

    it('defaults status to SCHEDULED when status is null/undefined', () => {
      const domain = SavingsGoalsMapper.toDomain(
        makeEntity({ status: undefined as unknown as GoalStatus }),
      );
      expect(domain.status).toBe(GoalStatus.SCHEDULED);
    });

    it('maps account relation when present', () => {
      const account = { id: 'acc-1', name: 'Bancolombia' };
      const domain = SavingsGoalsMapper.toDomain(makeEntity({ account: account as never }));
      expect(domain.account).toEqual(account);
      expect(domain.accountName).toBe('Bancolombia');
    });

    it('returns empty accountName when account is not loaded', () => {
      const domain = SavingsGoalsMapper.toDomain(makeEntity({ account: undefined as never }));
      expect(domain.accountName).toBe('');
    });

    it('maps lastInterestDate when present', () => {
      const date = new Date('2024-05-01');
      const domain = SavingsGoalsMapper.toDomain(makeEntity({ lastInterestDate: date }));
      expect(domain.lastInterestDate).toEqual(date);
    });

    it('maps nulledAt when set', () => {
      const date = new Date('2024-04-01');
      const domain = SavingsGoalsMapper.toDomain(makeEntity({ nulledAt: date }));
      expect(domain.nulledAt).toEqual(date);
    });
  });
});
