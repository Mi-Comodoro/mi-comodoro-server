import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { GoalStatus } from '../../../domain/savings-goals';
import { SavingGoalEntity } from '../../database/entities/saving-goals.entity';
import { GoalsRepositoryImpl } from '../goals.repository.impl';

const mockRepo = {
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const makeGoalEntity = (overrides = {}) => ({
  id: 'goal-1',
  userId: 'user-1',
  name: 'Vacaciones',
  reason: 'Descanso anual',
  targetAmount: '10000',
  targetDate: new Date('2026-12-01'),
  isActive: true,
  status: GoalStatus.SCHEDULED,
  accountId: 'acc-1',
  account: { id: 'acc-1', name: 'Cuenta Ahorro', interestRate: '0' },
  lastInterestDate: null,
  updatedAt: new Date('2026-01-01'),
  nulledAt: null,
  ...overrides,
});

describe('GoalsRepositoryImpl', () => {
  let repository: GoalsRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsRepositoryImpl,
        { provide: getRepositoryToken(SavingGoalEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<GoalsRepositoryImpl>(GoalsRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('saves goal and returns domain object', async () => {
      mockRepo.save.mockResolvedValue(makeGoalEntity());
      const result = await repository.create({ userId: 'user-1', name: 'Vacaciones' } as never);
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ id: 'goal-1', name: 'Vacaciones' });
    });
  });

  describe('find', () => {
    it('returns non-deleted goals for user', async () => {
      mockRepo.find.mockResolvedValue([
        makeGoalEntity(),
        makeGoalEntity({ id: 'goal-2', name: 'Auto' }),
      ]);
      const result = await repository.find('user-1');
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no goals', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await repository.find('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('returns goal when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeGoalEntity());
      const result = await repository.findById('goal-1');
      expect(result).toMatchObject({ id: 'goal-1' });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('findByIdAndUser', () => {
    it('returns goal when found for user', async () => {
      mockRepo.findOne.mockResolvedValue(makeGoalEntity());
      const result = await repository.findByIdAndUser('goal-1', 'user-1');
      expect(result).toMatchObject({ id: 'goal-1', userId: 'user-1' });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findByIdAndUser('unknown', 'user-1');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('returns null when goal not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.update('unknown', 'user-1', { name: 'Nuevo nombre' });
      expect(result).toBeNull();
    });

    it('updates goal and returns updated domain object', async () => {
      const entity = makeGoalEntity();
      mockRepo.findOne
        .mockResolvedValueOnce(entity)
        .mockResolvedValueOnce(makeGoalEntity({ name: 'Moto' }));
      mockRepo.update.mockResolvedValue({ affected: 1 });
      const result = await repository.update('goal-1', 'user-1', { name: 'Moto' });
      expect(result).toMatchObject({ name: 'Moto' });
    });
  });

  describe('findActiveWithInterest', () => {
    it('returns active goals with interest', async () => {
      mockRepo.find.mockResolvedValue([makeGoalEntity({ status: GoalStatus.IN_PROGRESS })]);
      const result = await repository.findActiveWithInterest();
      expect(result).toHaveLength(1);
    });
  });

  describe('updateLastInterestDate', () => {
    it('updates lastInterestDate for goal', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      const date = new Date('2026-06-01');
      await repository.updateLastInterestDate('goal-1', date);
      expect(mockRepo.update).toHaveBeenCalledWith('goal-1', { lastInterestDate: date });
    });
  });

  describe('delete', () => {
    it('soft-deletes goal by setting nulledAt', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.delete('goal-1');
      expect(mockRepo.update).toHaveBeenCalledWith(
        'goal-1',
        expect.objectContaining({ nulledAt: expect.any(Date) }),
      );
    });
  });
});
