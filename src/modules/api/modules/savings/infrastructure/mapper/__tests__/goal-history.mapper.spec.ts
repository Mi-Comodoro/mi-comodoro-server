import { GoalHistoryEntity } from '../../database/entities/goal-history.entity';
import { GoalHistoryMapper } from '../goal-history.mapper';

const makeEntity = (overrides: Partial<GoalHistoryEntity> = {}): GoalHistoryEntity => {
  const e = new GoalHistoryEntity();
  e.id = 'gh-1';
  e.goalId = 'goal-1';
  e.userId = 'user-1';
  e.field = 'status';
  e.oldValue = 'SCHEDULED';
  e.newValue = 'IN_PROGRESS';
  e.changedAt = new Date('2024-06-15T10:00:00Z');
  return Object.assign(e, overrides);
};

describe('GoalHistoryMapper', () => {
  describe('toDomain', () => {
    it('maps all fields correctly', () => {
      const domain = GoalHistoryMapper.toDomain(makeEntity());

      expect(domain.id).toBe('gh-1');
      expect(domain.goalId).toBe('goal-1');
      expect(domain.userId).toBe('user-1');
      expect(domain.field).toBe('status');
      expect(domain.oldValue).toBe('SCHEDULED');
      expect(domain.newValue).toBe('IN_PROGRESS');
      expect(domain.changedAt).toEqual(new Date('2024-06-15T10:00:00Z'));
    });

    it('maps oldValue as null when null', () => {
      const domain = GoalHistoryMapper.toDomain(makeEntity({ oldValue: null }));
      expect(domain.oldValue).toBeNull();
    });
  });

  describe('toEntity', () => {
    const baseDomain = {
      goalId: 'goal-1',
      userId: 'user-1',
      field: 'name',
      oldValue: 'Viejo' as string | null,
      newValue: 'Nuevo',
    };

    it('maps all required fields onto entity', () => {
      const entity = GoalHistoryMapper.toEntity(baseDomain);

      expect(entity).toBeInstanceOf(GoalHistoryEntity);
      expect(entity.goalId).toBe('goal-1');
      expect(entity.userId).toBe('user-1');
      expect(entity.field).toBe('name');
      expect(entity.oldValue).toBe('Viejo');
      expect(entity.newValue).toBe('Nuevo');
    });

    it('does not set id when not provided', () => {
      const entity = GoalHistoryMapper.toEntity(baseDomain);
      expect(entity.id).toBeUndefined();
    });

    it('sets id when provided', () => {
      const entity = GoalHistoryMapper.toEntity({ id: 'gh-99', ...baseDomain });
      expect(entity.id).toBe('gh-99');
    });

    it('sets changedAt when provided', () => {
      const date = new Date('2024-07-01');
      const entity = GoalHistoryMapper.toEntity({ ...baseDomain, changedAt: date });
      expect(entity.changedAt).toEqual(date);
    });

    it('maps null oldValue', () => {
      const entity = GoalHistoryMapper.toEntity({ ...baseDomain, oldValue: null });
      expect(entity.oldValue).toBeNull();
    });
  });
});
