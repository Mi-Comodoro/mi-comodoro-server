import { SavingAllocationEntity } from '../../database/entities/saving-allocations.entity';
import { SavingAllocationMapper } from '../allocation.mapper';

const makeEntity = (overrides: Partial<SavingAllocationEntity> = {}): SavingAllocationEntity => {
  const e = new SavingAllocationEntity();
  e.id = 'alloc-1';
  e.goalId = 'goal-1';
  e.budgetId = 'budget-1';
  e.percentage = 30;
  e.updatedAt = new Date('2024-06-01');
  (e as unknown as Record<string, unknown>).goal = undefined;
  return Object.assign(e, overrides);
};

describe('SavingAllocationMapper', () => {
  describe('toDomain', () => {
    it('maps all scalar fields correctly', () => {
      const domain = SavingAllocationMapper.toDomain(makeEntity());

      expect(domain.id).toBe('alloc-1');
      expect(domain.goalId).toBe('goal-1');
      expect(domain.budgetId).toBe('budget-1');
      expect(domain.percentage).toBe(30);
    });

    it('maps goal relation when present', () => {
      const goalStub = { id: 'goal-1', name: 'Vacaciones', accountId: 'acc-1' };
      const domain = SavingAllocationMapper.toDomain(makeEntity({ goal: goalStub as never }));
      expect(domain.goal).toEqual(goalStub);
    });

    it('maps goal as undefined when not present', () => {
      const domain = SavingAllocationMapper.toDomain(makeEntity({ goal: undefined as never }));
      expect(domain.goal).toBeUndefined();
    });

    it('maps updatedAt correctly', () => {
      const date = new Date('2024-07-15');
      const domain = SavingAllocationMapper.toDomain(makeEntity({ updatedAt: date }));
      expect(domain.updatedAt).toEqual(date);
    });
  });
});
