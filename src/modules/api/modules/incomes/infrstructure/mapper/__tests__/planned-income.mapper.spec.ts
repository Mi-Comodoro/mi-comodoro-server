import { PlannedIncomeMapper } from '../planned-income.mapper';

const makeEntity = (overrides = {}) =>
  ({
    id: 'pi-1',
    amount: 3000000,
    source: 'Salario',
    date: new Date('2024-06-01'),
    status: 'PLANNED' as const,
    budgetId: 'budget-1',
    updatedAt: new Date('2024-06-01'),
    incomeSourceId: 'src-1',
    createdAt: new Date('2024-06-01'),
    incomeSource: undefined,
    ...overrides,
  }) as never;

describe('PlannedIncomeMapper', () => {
  describe('toDomain', () => {
    it('maps all fields from entity', () => {
      const result = PlannedIncomeMapper.toDomain(makeEntity());
      expect(result.id).toBe('pi-1');
      expect(result.amount).toBe(3000000);
      expect(result.budgetId).toBe('budget-1');
    });

    it('uses incomeSource.source when present', () => {
      const entity = makeEntity({ incomeSource: { source: 'Freelance' } });
      const result = PlannedIncomeMapper.toDomain(entity);
      expect(result.source).toBe('Freelance');
    });

    it('falls back to entity.source when incomeSource is absent', () => {
      const result = PlannedIncomeMapper.toDomain(
        makeEntity({ incomeSource: undefined, source: 'Bono' }),
      );
      expect(result.source).toBe('Bono');
    });

    it('uses default source when neither incomeSource nor entity.source is set', () => {
      const result = PlannedIncomeMapper.toDomain(
        makeEntity({ incomeSource: undefined, source: undefined }),
      );
      expect(result.source).toBe('Ingreso puntual');
    });

    it('sets incomeSourceId to empty string when undefined', () => {
      const result = PlannedIncomeMapper.toDomain(makeEntity({ incomeSourceId: undefined }));
      expect(result.incomeSourceId).toBe('');
    });
  });
});
