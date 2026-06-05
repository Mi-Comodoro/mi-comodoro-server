import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { PlannedExpenseStatus } from '../../../domain/expenses';
import { ExpenseService } from '../expense.service';

const mockExpenseRepo = {
  findById: jest.fn(),
  add: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  cancel: jest.fn(),
};
const mockBudgetRepo = { findById: jest.fn() };
const mockTransactionRepo = { save: jest.fn() };
const mockCategoryRepo = { findById: jest.fn() };
const mockAccountRepo = { findPrimaryByUserId: jest.fn() };
const mockDataSource = { transaction: jest.fn() };
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

const makeExpense = (overrides = {}) => ({
  id: 'exp-1',
  budgetId: 'budget-1',
  categoryId: 'cat-1',
  name: 'Netflix',
  expectedAmount: 50000,
  status: PlannedExpenseStatus.PLANNED,
  isEssential: false,
  dueDate: new Date('2024-06-15'),
  ...overrides,
});

describe('ExpenseService', () => {
  let service: ExpenseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseService,
        { provide: 'PlannedExpenseRepository', useValue: mockExpenseRepo },
        { provide: 'BudgetRepository', useValue: mockBudgetRepo },
        { provide: 'TransactionRepository', useValue: mockTransactionRepo },
        { provide: 'CategoryRepository', useValue: mockCategoryRepo },
        { provide: 'AccountRepository', useValue: mockAccountRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ExpenseService>(ExpenseService);
    jest.clearAllMocks();
  });

  // ─── addPlan ───────────────────────────────────────────────────────────────
  describe('addPlan', () => {
    const dto = {
      budgetId: 'budget-1',
      categoryId: 'cat-1',
      name: 'Netflix',
      expectedAmount: 50000,
      dueDate: '2024-06-15',
      status: PlannedExpenseStatus.PLANNED,
      isEssential: false,
    };

    it('throws NotFoundException when budget not found', async () => {
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.addPlan(dto as never, 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when budget belongs to another user', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'other' }));
      await expect(service.addPlan(dto as never, 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('saves and returns the planned expense', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockExpenseRepo.add.mockResolvedValue(makeExpense());

      const result = await service.addPlan(dto as never, 'user-1');
      expect(mockExpenseRepo.add).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('exp-1');
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('throws BadRequestException when budgetId is missing', async () => {
      await expect(service.findAll({} as never, 'u-1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when budget not found', async () => {
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.findAll({ budgetId: 'b-1' } as never, 'u-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns all expenses for the budget', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockExpenseRepo.findAll.mockResolvedValue([makeExpense()]);

      const result = await service.findAll({ budgetId: 'budget-1' } as never, 'user-1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── createUnplannedExpense ────────────────────────────────────────────────
  describe('createUnplannedExpense', () => {
    const baseData = {
      userId: 'user-1',
      amount: 30000,
      categoryId: 'cat-1',
      budgetId: 'budget-1',
      date: new Date(),
    };

    it('throws NotFoundException when budget not found', async () => {
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.createUnplannedExpense(baseData)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when budget is not ACTIVE', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ status: 'PLANNED' }));
      await expect(service.createUnplannedExpense(baseData)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when budget belongs to another user', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'other' }));
      await expect(service.createUnplannedExpense(baseData)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when amount is negative', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      await expect(service.createUnplannedExpense({ ...baseData, amount: -1 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when category not found', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findById.mockResolvedValue(null);
      await expect(service.createUnplannedExpense(baseData)).rejects.toThrow(NotFoundException);
    });

    it('creates transaction and returns it', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findById.mockResolvedValue({ id: 'cat-1' });
      mockTransactionRepo.save.mockResolvedValue({ id: 'tx-1', amount: 30000 });

      const result = await service.createUnplannedExpense(baseData);
      expect(result.transaction.id).toBe('tx-1');
    });

    it('uses trimmed description as source when provided', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findById.mockResolvedValue({ id: 'cat-1' });
      mockTransactionRepo.save.mockResolvedValue({ id: 'tx-2' });

      await service.createUnplannedExpense({ ...baseData, description: '  Taxi  ' });
      expect(mockTransactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'Taxi', description: 'Taxi' }),
      );
    });

    it('uses default source when description is not provided', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findById.mockResolvedValue({ id: 'cat-1' });
      mockTransactionRepo.save.mockResolvedValue({ id: 'tx-3' });

      await service.createUnplannedExpense(baseData);
      expect(mockTransactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'Gasto no planificado' }),
      );
    });
  });

  // ─── updatePlannedExpense ──────────────────────────────────────────────────
  describe('updatePlannedExpense', () => {
    it('throws NotFoundException when expense not found', async () => {
      mockExpenseRepo.findById.mockResolvedValue(null);
      await expect(service.updatePlannedExpense('e-1', 'u-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when budget not found', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.updatePlannedExpense('e-1', 'u-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when budget belongs to another user', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'other' }));
      await expect(service.updatePlannedExpense('e-1', 'u-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when update returns null', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockExpenseRepo.update.mockResolvedValue(null);
      await expect(
        service.updatePlannedExpense('e-1', 'user-1', { name: 'Nuevo' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ignores budgetId and status in the update data', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      const updated = makeExpense({ name: 'Actualizado' });
      mockExpenseRepo.update.mockResolvedValue(updated);

      await service.updatePlannedExpense('exp-1', 'user-1', {
        name: 'Actualizado',
        budgetId: 'other-budget',
        status: PlannedExpenseStatus.PAID,
      });

      const updateCallArg = mockExpenseRepo.update.mock.calls[0][1];
      expect(updateCallArg.budgetId).toBeUndefined();
      expect(updateCallArg.status).toBeUndefined();
      expect(updateCallArg.name).toBe('Actualizado');
    });

    it('returns updated expense', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockExpenseRepo.update.mockResolvedValue(makeExpense({ name: 'Actualizado' }));

      const result = await service.updatePlannedExpense('exp-1', 'user-1', { name: 'Actualizado' });
      expect(result.name).toBe('Actualizado');
    });
  });

  // ─── cancelPlannedExpense ──────────────────────────────────────────────────
  describe('cancelPlannedExpense', () => {
    it('throws NotFoundException when expense not found', async () => {
      mockExpenseRepo.findById.mockResolvedValue(null);
      await expect(service.cancelPlannedExpense('e-1', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when budget not found', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.cancelPlannedExpense('e-1', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when budget belongs to another user', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'other' }));
      await expect(service.cancelPlannedExpense('e-1', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when expense is already PAID', async () => {
      mockExpenseRepo.findById.mockResolvedValue(
        makeExpense({ status: PlannedExpenseStatus.PAID }),
      );
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      await expect(service.cancelPlannedExpense('e-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when expense is already CANCELED', async () => {
      mockExpenseRepo.findById.mockResolvedValue(
        makeExpense({ status: PlannedExpenseStatus.CANCELED }),
      );
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      await expect(service.cancelPlannedExpense('e-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cancels and returns the expense', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockExpenseRepo.cancel.mockResolvedValue(
        makeExpense({ status: PlannedExpenseStatus.CANCELED }),
      );

      const result = await service.cancelPlannedExpense('exp-1', 'user-1');
      expect(result.status).toBe(PlannedExpenseStatus.CANCELED);
    });
  });
});
