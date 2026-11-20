import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';
import { PlannedExpenseEntity } from '@/modules/api/modules/expenses/infrastructure/database/expenses-planned.entity';

import { BillsService } from '../bills.service';

const mockBillsRepo = {
  findAllByUser: jest.fn(),
  findActiveByUser: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  toggleActive: jest.fn(),
  delete: jest.fn(),
  findManyByIds: jest.fn(),
};

const mockBudgetRepo = { findById: jest.fn() };
const mockUserRepo = { findAuthById: jest.fn() };
const mockPlannedExpenseRepo = { save: jest.fn() };
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makeBill = (overrides = {}) => ({
  id: 'bill-1',
  userId: 'user-1',
  name: 'Netflix',
  expectedAmount: 49900,
  billingDay: 15,
  frequency: 'monthly',
  categoryId: 'cat-1',
  isActive: true,
  isPaid: false,
  ...overrides,
});

describe('BillsService', () => {
  let service: BillsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillsService,
        { provide: 'BillsRepository', useValue: mockBillsRepo },
        { provide: 'BudgetRepository', useValue: mockBudgetRepo },
        { provide: 'UserRepository', useValue: mockUserRepo },
        { provide: getRepositoryToken(PlannedExpenseEntity), useValue: mockPlannedExpenseRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<BillsService>(BillsService);
    jest.clearAllMocks();
  });

  // ─── findAll ───────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('returns all bills for user', async () => {
      mockBillsRepo.findAllByUser.mockResolvedValue([makeBill()]);
      const result = await service.findAll('user-1');
      expect(mockBillsRepo.findAllByUser).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── findActive ────────────────────────────────────────────────────────────
  describe('findActive', () => {
    it('returns active bills for user', async () => {
      mockBillsRepo.findActiveByUser.mockResolvedValue([makeBill()]);
      const result = await service.findActive('user-1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('creates bill with isActive=true and isPaid=false', async () => {
      const dto = {
        name: 'Spotify',
        expectedAmount: 15000,
        billingDay: 5,
        frequency: 'monthly',
        categoryId: 'cat-1',
      };
      mockBillsRepo.create.mockResolvedValue(makeBill({ name: 'Spotify' }));

      await service.create(dto as never, 'user-1');

      expect(mockBillsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true, isPaid: false }),
      );
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('throws NotFoundException when update returns null', async () => {
      mockBillsRepo.update.mockResolvedValue(null);
      await expect(service.update('bill-1', {}, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('returns updated bill', async () => {
      mockBillsRepo.update.mockResolvedValue(makeBill({ name: 'Disney+' }));
      const result = await service.update('bill-1', { name: 'Disney+' } as never, 'user-1');
      expect(result.name).toBe('Disney+');
    });
  });

  // ─── toggleActive ──────────────────────────────────────────────────────────
  describe('toggleActive', () => {
    it('throws NotFoundException when toggleActive returns null', async () => {
      mockBillsRepo.toggleActive.mockResolvedValue(null);
      await expect(service.toggleActive('bill-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('returns toggled bill', async () => {
      mockBillsRepo.toggleActive.mockResolvedValue(makeBill({ isActive: false }));
      const result = await service.toggleActive('bill-1', 'user-1');
      expect(result.isActive).toBe(false);
    });
  });

  // ─── delete ────────────────────────────────────────────────────────────────
  describe('delete', () => {
    it('delegates to repository', async () => {
      mockBillsRepo.delete.mockResolvedValue(undefined);
      await service.delete('bill-1', 'user-1');
      expect(mockBillsRepo.delete).toHaveBeenCalledWith('bill-1', 'user-1');
    });
  });

  // ─── importToBudget ────────────────────────────────────────────────────────
  describe('importToBudget', () => {
    it('throws NotFoundException when budget not found', async () => {
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(
        service.importToBudget({ billIds: ['bill-1'] } as never, 'budget-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when budget owner mismatch', async () => {
      mockBudgetRepo.findById.mockResolvedValue({
        id: 'budget-1',
        ownerId: 'other-user',
        month: 'junio',
        year: 2024,
      });
      await expect(
        service.importToBudget({ billIds: ['bill-1'] } as never, 'budget-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when no bills found', async () => {
      mockBudgetRepo.findById.mockResolvedValue({
        id: 'budget-1',
        ownerId: 'user-1',
        month: 'junio',
        year: 2024,
      });
      mockBillsRepo.findManyByIds.mockResolvedValue([]);
      await expect(
        service.importToBudget({ billIds: ['bill-1'] } as never, 'budget-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates planned expenses and returns count', async () => {
      mockBudgetRepo.findById.mockResolvedValue({
        id: 'budget-1',
        ownerId: 'user-1',
        month: 'junio',
        year: 2024,
      });
      mockBillsRepo.findManyByIds.mockResolvedValue([makeBill(), makeBill({ id: 'bill-2' })]);
      mockUserRepo.findAuthById.mockResolvedValue({ timezone: 'America/Bogota' });
      mockPlannedExpenseRepo.save.mockResolvedValue([]);

      const result = await service.importToBudget(
        { billIds: ['bill-1', 'bill-2'] } as never,
        'budget-1',
        'user-1',
      );

      expect(result).toBe(2);
      expect(mockPlannedExpenseRepo.save).toHaveBeenCalledTimes(1);
    });

    it('uses default timezone when user not found', async () => {
      mockBudgetRepo.findById.mockResolvedValue({
        id: 'budget-1',
        ownerId: 'user-1',
        month: 'enero',
        year: 2024,
      });
      mockBillsRepo.findManyByIds.mockResolvedValue([makeBill()]);
      mockUserRepo.findAuthById.mockResolvedValue(null);
      mockPlannedExpenseRepo.save.mockResolvedValue([]);

      const result = await service.importToBudget(
        { billIds: ['bill-1'] } as never,
        'budget-1',
        'user-1',
      );

      expect(result).toBe(1);
    });
  });
});
