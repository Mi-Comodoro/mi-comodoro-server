import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { GoalHistoryEntity } from '../../database/entities/goal-history.entity';
import { GoalHistoryRepositoryImpl } from '../goal-history.repository.impl';

const mockRepo = { save: jest.fn(), find: jest.fn() };

describe('GoalHistoryRepositoryImpl', () => {
  let repository: GoalHistoryRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalHistoryRepositoryImpl,
        { provide: getRepositoryToken(GoalHistoryEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<GoalHistoryRepositoryImpl>(GoalHistoryRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('add', () => {
    it('maps to entity, saves, and returns domain object', async () => {
      const entry = {
        goalId: 'goal-1',
        userId: 'user-1',
        field: 'status',
        oldValue: 'SCHEDULED',
        newValue: 'IN_PROGRESS',
      };
      mockRepo.save.mockResolvedValue({ id: 'hist-1', ...entry, changedAt: new Date() });

      const result = await repository.add(entry as never);

      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ goalId: 'goal-1', field: 'status' });
    });
  });

  describe('findByGoalId', () => {
    it('returns history entries for goal ordered by changedAt DESC', async () => {
      const entries = [
        {
          id: 'hist-2',
          goalId: 'goal-1',
          field: 'name',
          oldValue: 'A',
          newValue: 'B',
          changedAt: new Date(),
        },
        {
          id: 'hist-1',
          goalId: 'goal-1',
          field: 'status',
          oldValue: 'SCHEDULED',
          newValue: 'IN_PROGRESS',
          changedAt: new Date(),
        },
      ];
      mockRepo.find.mockResolvedValue(entries);

      const result = await repository.findByGoalId('goal-1');

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { goalId: 'goal-1' },
        order: { changedAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no history', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await repository.findByGoalId('goal-1');
      expect(result).toEqual([]);
    });
  });
});
