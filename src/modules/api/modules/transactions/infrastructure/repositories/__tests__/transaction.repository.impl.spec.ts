import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { TransactionEntity } from '../../database/entities/transaction.entity';
import { TransactionRepositoryImpl } from '../transaction.repository.impl';

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn(),
};

const mockRepo = {
  save: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

const makeTransactionEntity = (overrides = {}) => ({
  id: 'tx-1',
  amount: '500',
  source: 'Salario',
  description: null,
  userId: 'user-1',
  budgetId: 'budget-1',
  categoryId: 'cat-1',
  type: 'income',
  transactionDate: new Date('2026-01-15'),
  nulledAt: null,
  billId: null,
  plannedExpenseId: null,
  plannedIncomeId: null,
  accountId: 'acc-1',
  savingGoalId: null,
  fromAccountId: null,
  toAccountId: null,
  category: null,
  account: null,
  fromAccount: null,
  toAccount: null,
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
  ...overrides,
});

describe('TransactionRepositoryImpl', () => {
  let repository: TransactionRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionRepositoryImpl,
        { provide: getRepositoryToken(TransactionEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<TransactionRepositoryImpl>(TransactionRepositoryImpl);
    jest.clearAllMocks();
    mockRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  describe('save', () => {
    it('maps to entity, saves and returns domain object', async () => {
      mockRepo.save.mockResolvedValue(makeTransactionEntity());
      const result = await repository.save({
        amount: 500,
        source: 'Salario',
        userId: 'user-1',
        budgetId: 'budget-1',
        type: 'income',
        transactionDate: new Date('2026-01-15'),
      });
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ id: 'tx-1', amount: 500 });
    });
  });

  describe('findById', () => {
    it('returns transaction when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeTransactionEntity());
      const result = await repository.findById('tx-1');
      expect(result).toMatchObject({ id: 'tx-1' });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('returns null when no rows affected', async () => {
      mockRepo.update.mockResolvedValue({ affected: 0 });
      const result = await repository.update('unknown', { amount: 100 });
      expect(result).toBeNull();
    });

    it('updates transaction and returns refreshed entity', async () => {
      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockRepo.findOne.mockResolvedValue(makeTransactionEntity({ amount: '100' }));
      const result = await repository.update('tx-1', { amount: 100 });
      expect(result).toMatchObject({ id: 'tx-1' });
    });
  });

  describe('findByBudget', () => {
    it('returns paginated transactions with default pagination', async () => {
      mockRepo.findAndCount.mockResolvedValue([[makeTransactionEntity()], 1]);
      const result = await repository.findByBudget('budget-1', {});
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('applies type filter correctly', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);
      await repository.findByBudget('budget-1', { type: 'savings', page: 2, limit: 10 });
      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('applies date range filter when both dates provided', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);
      await repository.findByBudget('budget-1', {
        dateFrom: new Date('2026-01-01'),
        dateTo: new Date('2026-01-31'),
      });
      expect(mockRepo.findAndCount).toHaveBeenCalledTimes(1);
    });
  });

  describe('softDelete', () => {
    it('returns true when row was affected', async () => {
      mockRepo.update.mockResolvedValue({ affected: 1 });
      const result = await repository.softDelete('tx-1');
      expect(result).toBe(true);
    });

    it('returns false when no row affected', async () => {
      mockRepo.update.mockResolvedValue({ affected: 0 });
      const result = await repository.softDelete('unknown');
      expect(result).toBe(false);
    });
  });

  describe('findByGoalId', () => {
    it('returns transactions for goal', async () => {
      mockRepo.find.mockResolvedValue([makeTransactionEntity({ savingGoalId: 'goal-1' })]);
      const result = await repository.findByGoalId('goal-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getGoalSummary', () => {
    it('returns total savings and interest for goal', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { type: 'savings', total: '8000' },
        { type: 'interest', total: '200' },
      ]);
      const result = await repository.getGoalSummary('goal-1', 'user-1', 'acc-1', 'Vacaciones');
      expect(result.totalSavings).toBe(8000);
      expect(result.totalInterest).toBe(200);
    });

    it('returns zeros when no transactions found', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      const result = await repository.getGoalSummary('goal-1', 'user-1', 'acc-1', 'Vacaciones');
      expect(result.totalSavings).toBe(0);
      expect(result.totalInterest).toBe(0);
    });
  });
});
