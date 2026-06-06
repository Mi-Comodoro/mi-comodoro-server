import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { PlannedSavingStatus } from '../../../domain/savings-planned';
import { PlannedSavingEntity } from '../../database/entities/saving-planned.entity';
import { PlannedSavingRepositoryImpl } from '../planned.repository.impl';

const mockQueryBuilder = {
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn(),
  getMany: jest.fn(),
};

const mockRepo = {
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

const makePlannedEntity = (overrides = {}) => ({
  id: 'ps-1',
  amount: '1000',
  date: new Date('2026-01-15'),
  status: PlannedSavingStatus.PENDING,
  completedAt: null,
  account: { id: 'acc-1', name: 'Cuenta Ahorro' },
  budget: { id: 'budget-1' },
  plannedIncome: null,
  savingGoal: { id: 'goal-1', name: 'Vacaciones', reason: 'Descanso' },
  ...overrides,
});

describe('PlannedSavingRepositoryImpl', () => {
  let repository: PlannedSavingRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlannedSavingRepositoryImpl,
        { provide: getRepositoryToken(PlannedSavingEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<PlannedSavingRepositoryImpl>(PlannedSavingRepositoryImpl);
    jest.clearAllMocks();
    mockRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  describe('save', () => {
    it('maps to entity, saves and returns domain', async () => {
      mockRepo.save.mockResolvedValue(makePlannedEntity());
      const result = await repository.save({
        amount: 1000,
        date: new Date('2026-01-15'),
        status: PlannedSavingStatus.PENDING,
        budgetId: 'budget-1',
      });
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ amount: 1000 });
    });
  });

  describe('saveMany', () => {
    it('saves multiple planned savings and returns domain array', async () => {
      mockRepo.save.mockResolvedValue([makePlannedEntity(), makePlannedEntity({ id: 'ps-2' })]);
      const result = await repository.saveMany([
        {
          amount: 1000,
          date: new Date('2026-01-15'),
          status: PlannedSavingStatus.PENDING,
          budgetId: 'budget-1',
        },
      ]);
      expect(result).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('returns planned saving when found', async () => {
      mockRepo.findOne.mockResolvedValue(makePlannedEntity());
      const result = await repository.findById('ps-1');
      expect(result).toMatchObject({ amount: 1000 });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('findByBudget', () => {
    it('returns planned savings for budget', async () => {
      mockRepo.find.mockResolvedValue([makePlannedEntity(), makePlannedEntity({ id: 'ps-2' })]);
      const result = await repository.findByBudget('budget-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('findByGoalId', () => {
    it('returns planned savings for goal', async () => {
      mockRepo.find.mockResolvedValue([makePlannedEntity()]);
      const result = await repository.findByGoalId('goal-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('returns null when no scalar changes and no relation changes', async () => {
      const result = await repository.update('ps-1', {});
      expect(result).toBeNull();
    });

    it('returns null when scalar update affects 0 rows', async () => {
      mockRepo.update.mockResolvedValue({ affected: 0 });
      const result = await repository.update('ps-1', { status: PlannedSavingStatus.COMPLETED });
      expect(result).toBeNull();
    });

    it('updates status and returns refreshed entity', async () => {
      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockRepo.findOne.mockResolvedValue(
        makePlannedEntity({ status: PlannedSavingStatus.COMPLETED }),
      );
      const result = await repository.update('ps-1', { status: PlannedSavingStatus.COMPLETED });
      expect(result).toMatchObject({ status: PlannedSavingStatus.COMPLETED });
    });

    it('returns null when relation update finds no entity', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.update('ps-1', { savingGoalId: 'goal-2' });
      expect(result).toBeNull();
    });
  });

  describe('sumCompletedByGoalIds', () => {
    it('returns empty array when goalIds is empty', async () => {
      const result = await repository.sumCompletedByGoalIds([]);
      expect(result).toEqual([]);
    });

    it('returns aggregated totals per goal', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { goalId: 'goal-1', total: '5000' },
        { goalId: 'goal-2', total: '3000' },
      ]);
      const result = await repository.sumCompletedByGoalIds(['goal-1', 'goal-2']);
      expect(result).toHaveLength(2);
      expect(result[0].total).toBe(5000);
    });
  });

  describe('findCompletedLast6MonthsByUserId', () => {
    it('returns trend points grouped by month', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([
        { amount: '1000', completedAt: new Date('2026-05-01') },
        { amount: '2000', completedAt: new Date('2026-05-15') },
      ]);
      const result = await repository.findCompletedLast6MonthsByUserId('user-1');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('month');
      expect(result[0]).toHaveProperty('amount');
    });

    it('returns empty array when no completed savings', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      const result = await repository.findCompletedLast6MonthsByUserId('user-1');
      expect(result).toEqual([]);
    });
  });
});
