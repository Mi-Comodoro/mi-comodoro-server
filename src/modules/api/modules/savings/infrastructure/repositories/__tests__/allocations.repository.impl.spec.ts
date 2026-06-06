import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import { SavingAllocationEntity } from '../../database/entities/saving-allocations.entity';
import { SavingAllocationRepositoryImpl } from '../allocations.repository.impl';

const mockRepo = {
  save: jest.fn(),
  find: jest.fn(),
};

const mockManager = {
  delete: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
};

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

const makeAllocationEntity = (overrides = {}) => ({
  id: 'alloc-1',
  budgetId: 'budget-1',
  goalId: 'goal-1',
  amount: '500',
  goal: { id: 'goal-1', name: 'Vacaciones' },
  ...overrides,
});

describe('SavingAllocationRepositoryImpl', () => {
  let repository: SavingAllocationRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavingAllocationRepositoryImpl,
        { provide: getRepositoryToken(SavingAllocationEntity), useValue: mockRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    repository = module.get<SavingAllocationRepositoryImpl>(SavingAllocationRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('saves allocation and returns domain object', async () => {
      mockRepo.save.mockResolvedValue(makeAllocationEntity());
      const result = await repository.create({
        budgetId: 'budget-1',
        goalId: 'goal-1',
        amount: 500,
      } as never);
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ id: 'alloc-1' });
    });
  });

  describe('find', () => {
    it('returns allocations for budget with goal relation', async () => {
      mockRepo.find.mockResolvedValue([
        makeAllocationEntity(),
        makeAllocationEntity({ id: 'alloc-2' }),
      ]);
      const result = await repository.find('budget-1');
      expect(result).toHaveLength(2);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { budgetId: 'budget-1' },
        relations: { goal: true },
      });
    });

    it('returns empty array when no allocations', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await repository.find('budget-1');
      expect(result).toEqual([]);
    });
  });

  describe('replaceForBudget', () => {
    it('deletes existing, creates and saves new allocations in transaction', async () => {
      const savedEntities = [makeAllocationEntity()];
      const withRelations = [makeAllocationEntity()];
      mockDataSource.transaction.mockImplementation(
        (cb: (manager: typeof mockManager) => Promise<unknown>) => cb(mockManager),
      );
      mockManager.delete.mockResolvedValue(undefined);
      mockManager.create.mockReturnValue(savedEntities[0]);
      mockManager.save.mockResolvedValue(savedEntities);
      mockManager.find.mockResolvedValue(withRelations);

      const result = await repository.replaceForBudget('budget-1', [
        { goalId: 'goal-1', amount: 500 } as never,
      ]);

      expect(mockManager.delete).toHaveBeenCalledWith(SavingAllocationEntity, {
        budgetId: 'budget-1',
      });
      expect(result).toHaveLength(1);
    });

    it('logs error and rethrows on transaction failure', async () => {
      const error = new Error('DB error');
      mockDataSource.transaction.mockRejectedValue(error);

      await expect(repository.replaceForBudget('budget-1', [])).rejects.toThrow('DB error');
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
  });
});
