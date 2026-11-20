import { PlannedExpenseStatus } from '../../../domain/expenses';
import { PlannedExpenseEntity } from '../../database/expenses-planned.entity';
import { ExpenseMapper } from '../expense.mapper';

const makeEntity = (overrides: Partial<PlannedExpenseEntity> = {}): PlannedExpenseEntity => {
  const e = new PlannedExpenseEntity();
  e.id = 'exp-1';
  e.budgetId = 'budget-1';
  e.categoryId = 'cat-1';
  e.name = 'Netflix';
  e.expectedAmount = 50000;
  e.dueDate = new Date('2024-06-15');
  e.status = PlannedExpenseStatus.PLANNED;
  e.isEssential = false;
  e.notes = undefined;
  e.billsId = undefined;
  e.groupId = null;
  e.customBucketId = null;
  e.createdAt = new Date('2024-06-01');
  e.updatedAt = new Date('2024-06-01');
  return Object.assign(e, overrides);
};

describe('ExpenseMapper', () => {
  describe('toDomain', () => {
    it('maps all scalar fields correctly', () => {
      const domain = ExpenseMapper.toDomain(makeEntity());

      expect(domain.id).toBe('exp-1');
      expect(domain.budgetId).toBe('budget-1');
      expect(domain.categoryId).toBe('cat-1');
      expect(domain.name).toBe('Netflix');
      expect(domain.expectedAmount).toBe(50000);
      expect(domain.status).toBe(PlannedExpenseStatus.PLANNED);
      expect(domain.isEssential).toBe(false);
    });

    it('maps optional notes when present', () => {
      const domain = ExpenseMapper.toDomain(makeEntity({ notes: 'Suscripción mensual' }));
      expect(domain.notes).toBe('Suscripción mensual');
    });

    it('maps billsId when present', () => {
      const domain = ExpenseMapper.toDomain(makeEntity({ billsId: 'bill-1' }));
      expect(domain.billsId).toBe('bill-1');
    });

    it('maps groupId and customBucketId when present', () => {
      const domain = ExpenseMapper.toDomain(
        makeEntity({ groupId: 'grp-1', customBucketId: 'bkt-1' }),
      );
      expect(domain.groupId).toBe('grp-1');
      expect(domain.customBucketId).toBe('bkt-1');
    });
  });

  describe('toEntity', () => {
    const baseDomain = {
      budgetId: 'budget-1',
      categoryId: 'cat-1',
      name: 'Netflix',
      expectedAmount: 50000,
      dueDate: new Date('2024-06-15'),
      status: PlannedExpenseStatus.PLANNED,
      isEssential: false,
    };

    it('maps required fields onto entity', () => {
      const entity = ExpenseMapper.toEntity(baseDomain);
      expect(entity).toBeInstanceOf(PlannedExpenseEntity);
      expect(entity.name).toBe('Netflix');
      expect(entity.expectedAmount).toBe(50000);
      expect(entity.status).toBe(PlannedExpenseStatus.PLANNED);
      expect(entity.isEssential).toBe(false);
    });

    it('does not set id when not provided', () => {
      expect(ExpenseMapper.toEntity(baseDomain).id).toBeUndefined();
    });

    it('sets id when provided (for updates)', () => {
      expect(ExpenseMapper.toEntity({ id: 'exp-99', ...baseDomain }).id).toBe('exp-99');
    });

    it('sets billsId to undefined when provided as whitespace', () => {
      const entity = ExpenseMapper.toEntity({ ...baseDomain, billsId: '   ' });
      expect(entity.billsId).toBeUndefined();
    });

    it('preserves billsId when non-empty', () => {
      const entity = ExpenseMapper.toEntity({ ...baseDomain, billsId: 'bill-abc' });
      expect(entity.billsId).toBe('bill-abc');
    });

    it('maps groupId when provided', () => {
      const entity = ExpenseMapper.toEntity({ ...baseDomain, groupId: 'grp-1' });
      expect(entity.groupId).toBe('grp-1');
    });

    it('maps customBucketId when provided', () => {
      const entity = ExpenseMapper.toEntity({ ...baseDomain, customBucketId: 'bkt-1' });
      expect(entity.customBucketId).toBe('bkt-1');
    });
  });
});
