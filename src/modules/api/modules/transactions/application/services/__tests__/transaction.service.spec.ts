import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';

import { TransactionService } from '../transaction.service';

const mockTransactionRepo = {
  findById: jest.fn(),
  findByBudget: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};
const mockBudgetRepo = { findById: jest.fn() };
const mockCategoryRepo = { findById: jest.fn() };
const mockAccountRepo = { findByIdAndUser: jest.fn() };
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makeBudget = (overrides = {}) => ({
  id: 'budget-1',
  ownerId: 'user-1',
  status: 'ACTIVE',
  ...overrides,
});

const makeTransaction = (overrides = {}) => ({
  id: 'txn-1',
  budgetId: 'budget-1',
  userId: 'user-1',
  amount: 50000,
  type: 'expense',
  ...overrides,
});

describe('TransactionService', () => {
  let service: TransactionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        { provide: 'TransactionRepository', useValue: mockTransactionRepo },
        { provide: 'BudgetRepository', useValue: mockBudgetRepo },
        { provide: 'CategoryRepository', useValue: mockCategoryRepo },
        { provide: 'AccountRepository', useValue: mockAccountRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    jest.clearAllMocks();
  });

  // ─── findByBudget ──────────────────────────────────────────────────────────
  describe('findByBudget', () => {
    it('throws NotFoundException when budget does not exist', async () => {
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.findByBudget('b-1', 'u-1', {})).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when budget belongs to another user', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'other' }));
      await expect(service.findByBudget('b-1', 'u-1', {})).rejects.toThrow(NotFoundException);
    });

    it('returns paginated transactions for a valid budget', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      const paged = {
        data: [makeTransaction()],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockTransactionRepo.findByBudget.mockResolvedValue(paged);

      const result = await service.findByBudget('budget-1', 'user-1', { page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('passes valid type filter to repository', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockTransactionRepo.findByBudget.mockResolvedValue({
        data: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      await service.findByBudget('budget-1', 'user-1', { type: 'income' });
      expect(mockTransactionRepo.findByBudget).toHaveBeenCalledWith(
        'budget-1',
        expect.objectContaining({ type: 'income' }),
      );
    });

    it('ignores invalid type filter (sets type to undefined)', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockTransactionRepo.findByBudget.mockResolvedValue({
        data: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      await service.findByBudget('budget-1', 'user-1', { type: 'invalid' });
      expect(mockTransactionRepo.findByBudget).toHaveBeenCalledWith(
        'budget-1',
        expect.objectContaining({ type: undefined }),
      );
    });
  });

  // ─── createManual ──────────────────────────────────────────────────────────
  describe('createManual', () => {
    const baseDto = {
      budgetId: 'budget-1',
      amount: 50000,
      source: 'manual',
      type: 'expense' as const,
      categoryId: 'cat-1',
      transactionDate: new Date(),
    };

    it('throws NotFoundException when budget does not exist', async () => {
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.createManual(baseDto as never, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when budget belongs to another user', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'other' }));
      await expect(service.createManual(baseDto as never, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when budget is not ACTIVE', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ status: 'PLANNED' }));
      await expect(service.createManual(baseDto as never, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when expense has no categoryId', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      const dto = { ...baseDto, categoryId: undefined };
      await expect(service.createManual(dto as never, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when expense category does not exist', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findById.mockResolvedValue(null);
      await expect(service.createManual(baseDto as never, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when account does not belong to user', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findById.mockResolvedValue({ id: 'cat-1' });
      mockAccountRepo.findByIdAndUser.mockResolvedValue(null);
      const dto = { ...baseDto, accountId: 'acc-1' };
      await expect(service.createManual(dto as never, 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws BadRequestException when amount is zero', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findById.mockResolvedValue({ id: 'cat-1' });
      await expect(
        service.createManual({ ...baseDto, amount: 0 } as never, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when amount is negative', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findById.mockResolvedValue({ id: 'cat-1' });
      await expect(
        service.createManual({ ...baseDto, amount: -100 } as never, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates and returns the transaction', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findById.mockResolvedValue({ id: 'cat-1' });
      mockTransactionRepo.save.mockResolvedValue(makeTransaction());

      const result = await service.createManual(baseDto as never, 'user-1');
      expect(mockTransactionRepo.save).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('txn-1');
    });

    it('skips category validation for income type', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockTransactionRepo.save.mockResolvedValue(makeTransaction({ type: 'income' }));
      const dto = { ...baseDto, type: 'income' as const, categoryId: undefined };

      await service.createManual(dto as never, 'user-1');
      expect(mockCategoryRepo.findById).not.toHaveBeenCalled();
    });
  });

  // ─── updateTransaction ─────────────────────────────────────────────────────
  describe('updateTransaction', () => {
    it('throws NotFoundException when transaction does not exist', async () => {
      mockTransactionRepo.findById.mockResolvedValue(null);
      await expect(service.updateTransaction('t-1', 'u-1', {})).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when budget does not exist', async () => {
      mockTransactionRepo.findById.mockResolvedValue(makeTransaction());
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.updateTransaction('t-1', 'u-1', {})).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when budget belongs to another user', async () => {
      mockTransactionRepo.findById.mockResolvedValue(makeTransaction());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'other' }));
      await expect(service.updateTransaction('t-1', 'u-1', {})).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when category does not exist', async () => {
      mockTransactionRepo.findById.mockResolvedValue(makeTransaction());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findById.mockResolvedValue(null);
      await expect(
        service.updateTransaction('t-1', 'user-1', { categoryId: 'bad-cat' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when amount is zero', async () => {
      mockTransactionRepo.findById.mockResolvedValue(makeTransaction());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      await expect(service.updateTransaction('t-1', 'user-1', { amount: 0 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when update returns null', async () => {
      mockTransactionRepo.findById.mockResolvedValue(makeTransaction());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockTransactionRepo.update.mockResolvedValue(null);
      await expect(service.updateTransaction('t-1', 'user-1', { amount: 100 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns updated transaction', async () => {
      mockTransactionRepo.findById.mockResolvedValue(makeTransaction());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockTransactionRepo.update.mockResolvedValue(makeTransaction({ amount: 99000 }));

      const result = await service.updateTransaction('txn-1', 'user-1', { amount: 99000 });
      expect(result.amount).toBe(99000);
    });
  });

  // ─── softDeleteTransaction ─────────────────────────────────────────────────
  describe('softDeleteTransaction', () => {
    it('throws NotFoundException when transaction does not exist', async () => {
      mockTransactionRepo.findById.mockResolvedValue(null);
      await expect(service.softDeleteTransaction('t-1', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when budget does not exist', async () => {
      mockTransactionRepo.findById.mockResolvedValue(makeTransaction());
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.softDeleteTransaction('t-1', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when budget belongs to another user', async () => {
      mockTransactionRepo.findById.mockResolvedValue(makeTransaction());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'other' }));
      await expect(service.softDeleteTransaction('t-1', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when softDelete returns falsy', async () => {
      mockTransactionRepo.findById.mockResolvedValue(makeTransaction());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockTransactionRepo.softDelete.mockResolvedValue(null);
      await expect(service.softDeleteTransaction('txn-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('resolves when transaction is successfully soft deleted', async () => {
      mockTransactionRepo.findById.mockResolvedValue(makeTransaction());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockTransactionRepo.softDelete.mockResolvedValue({ affected: 1 });

      await expect(service.softDeleteTransaction('txn-1', 'user-1')).resolves.toBeUndefined();
    });
  });
});
