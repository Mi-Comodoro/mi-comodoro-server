import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { PlannedIncomeEntity } from '../../database/entities/incomes-planned.entity';
import { PlannedIncomeRepositoryImpl } from '../incomes-planned.repository.impl';

const mockQueryBuilder = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
};

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

const makePlannedEntity = (overrides = {}) => ({
  id: 'pi-1',
  budgetId: 'budget-1',
  incomeSourceId: 'src-1',
  source: 'Salario',
  amount: 15000,
  date: new Date('2026-01-01'),
  status: 'PENDING',
  incomeSource: { id: 'src-1', source: 'Salario' },
  updatedAt: new Date('2026-01-01'),
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

describe('PlannedIncomeRepositoryImpl', () => {
  let repository: PlannedIncomeRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlannedIncomeRepositoryImpl,
        { provide: getRepositoryToken(PlannedIncomeEntity), useValue: mockRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    repository = module.get<PlannedIncomeRepositoryImpl>(PlannedIncomeRepositoryImpl);
    jest.clearAllMocks();
    mockRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    Object.values(mockQueryBuilder).forEach((fn) => {
      if (typeof fn === 'function') (fn as jest.Mock).mockReturnThis?.();
    });
  });

  describe('create', () => {
    it('saves entity, fetches with relations and returns domain', async () => {
      const entity = makePlannedEntity();
      mockRepo.create.mockReturnValue(entity);
      mockRepo.save.mockResolvedValue(entity);
      mockRepo.findOne.mockResolvedValue(entity);

      const result = await repository.create({
        budgetId: 'budget-1',
        incomeSourceId: 'src-1',
        source: 'Salario',
        amount: 15000,
        date: new Date('2026-01-01'),
      });

      expect(result).toMatchObject({ budgetId: 'budget-1' });
    });

    it('uses saved entity when findOne returns null after save', async () => {
      const entity = makePlannedEntity();
      mockRepo.create.mockReturnValue(entity);
      mockRepo.save.mockResolvedValue(entity);
      mockRepo.findOne.mockResolvedValue(null);

      const result = await repository.create({ budgetId: 'budget-1', amount: 15000 });
      expect(result).toMatchObject({ budgetId: 'budget-1' });
    });
  });

  describe('generateIncomesPlannedForBudget', () => {
    it('creates monthly planned incomes', async () => {
      mockRepo.create.mockReturnValue({});
      mockRepo.save.mockResolvedValue([]);
      await repository.generateIncomesPlannedForBudget(
        'budget-1',
        [
          {
            id: 'src-1',
            source: 'Salario',
            amount: 15000,
            frequency: 'monthly',
            paymentDays: [1],
          } as never,
        ],
        2026,
        1,
      );
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
    });

    it('creates biweekly planned incomes (one per payment day)', async () => {
      mockRepo.create.mockReturnValue({});
      mockRepo.save.mockResolvedValue([]);
      await repository.generateIncomesPlannedForBudget(
        'budget-1',
        [
          {
            id: 'src-1',
            source: 'Salario',
            amount: 10000,
            frequency: 'biweekly',
            paymentDays: [1, 15],
          } as never,
        ],
        2026,
        1,
      );
      expect(mockRepo.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('findByBudgetId', () => {
    it('returns planned incomes for budget', async () => {
      mockRepo.find.mockResolvedValue([makePlannedEntity()]);
      const result = await repository.findByBudgetId('budget-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findByBudgetAndUser', () => {
    it('returns planned incomes via query builder', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([makePlannedEntity()]);
      const result = await repository.findByBudgetAndUser('budget-1', 'user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('returns planned income when found', async () => {
      mockRepo.findOne.mockResolvedValue(makePlannedEntity());
      const result = await repository.findById('pi-1');
      expect(result).not.toBeNull();
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('findAllPlanedIncomes', () => {
    it('returns all planned incomes', async () => {
      mockRepo.find.mockResolvedValue([makePlannedEntity(), makePlannedEntity({ id: 'pi-2' })]);
      const result = await repository.findAllPlanedIncomes();
      expect(result).toHaveLength(2);
    });
  });

  describe('markAsReceive', () => {
    it('marks planned income as RECEIVED and returns domain', async () => {
      const entity = makePlannedEntity({ status: 'PENDING' });
      mockRepo.findOne.mockResolvedValue(entity);
      mockRepo.update.mockResolvedValue(undefined);
      const result = await repository.markAsReceive('pi-1');
      expect(result).toMatchObject({ status: 'RECEIVED' });
    });

    it('returns undefined when already RECEIVED', async () => {
      mockRepo.findOne.mockResolvedValue(makePlannedEntity({ status: 'RECEIVED' }));
      const result = await repository.markAsReceive('pi-1');
      expect(result).toBeUndefined();
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.markAsReceive('unknown');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('deletes planned income by id', async () => {
      mockRepo.delete.mockResolvedValue(undefined);
      await repository.delete('pi-1');
      expect(mockRepo.delete).toHaveBeenCalledWith({ id: 'pi-1' });
    });
  });
});
