import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { SystemConfigService } from '@/core/modules/system-config/system-config.service';
import { LoggerProviderService } from '@/core/providers';

import { Budget } from '../../domain/budget';
import { BudgetService } from '../budget.service';

// ─── Stubs ────────────────────────────────────────────────────────────────────
const mockBudgetRepo = {
  findByFinancesIdAndMonth: jest.fn(),
  findAllByFinancesId: jest.fn(),
  findById: jest.fn(),
  findPreviousByFinancesId: jest.fn(),
  findHistoricalSummaryByFinancesId: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  close: jest.fn(),
  active: jest.fn(),
};
const mockFinancesRepo = { findByUserId: jest.fn() };
const mockPlannedIncomeRepo = { findByBudgetId: jest.fn(), save: jest.fn() };
const mockAllocationRepo = { findByBudgetId: jest.fn(), save: jest.fn() };
const mockPlannedExpenseRepo = { findByBudget: jest.fn(), save: jest.fn() };
const mockGoalsRepo = { findById: jest.fn(), update: jest.fn() };
const mockUserRepo = { findById: jest.fn() };
const mockDataSource = { createQueryRunner: jest.fn() };
const mockSystemConfig = { getNumber: jest.fn().mockResolvedValue(20) };
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makeBudget = (overrides: Partial<Budget> = {}): Budget =>
  ({
    id: 'budget-1',
    name: 'Presupuesto_Junio_de_2024',
    month: 'Junio',
    year: 2024,
    ownerId: 'user-1',
    financesId: 'finances-1',
    needsLimit: 50,
    wantsLimit: 30,
    savingsLimit: 20,
    isShared: false,
    strategy: 'BALANCED',
    frequency: 'monthly',
    status: 'PLANNED',
    ...overrides,
  }) as Budget;

// ─── Private-method interface ─────────────────────────────────────────────────
interface BudgetServicePrivate {
  resolveMonth(month: string | undefined, currentDate: Date): string;
  resolveYear(year: string | number | undefined, currentDate: Date): number;
  resolveBudgetName(month: string, year: number, name?: string): string;
  buildBudgetFromSource(
    source: Budget,
    userId: string,
    financesId: string,
    month: string,
    year: number,
    name?: string,
  ): Partial<Budget>;
}

describe('BudgetService', () => {
  let service: BudgetService;
  let priv: BudgetServicePrivate;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetService,
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: 'BudgetRepository', useValue: mockBudgetRepo },
        { provide: 'FinancesRepository', useValue: mockFinancesRepo },
        { provide: 'PlannedIncomeRepository', useValue: mockPlannedIncomeRepo },
        { provide: 'SavingAllocationRepository', useValue: mockAllocationRepo },
        { provide: 'PlannedExpenseRepository', useValue: mockPlannedExpenseRepo },
        { provide: 'GoalsRepository', useValue: mockGoalsRepo },
        { provide: 'UserRepository', useValue: mockUserRepo },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: SystemConfigService, useValue: mockSystemConfig },
      ],
    }).compile();

    service = module.get<BudgetService>(BudgetService);
    priv = service as unknown as BudgetServicePrivate;
    jest.clearAllMocks();
    mockSystemConfig.getNumber.mockResolvedValue(20);
  });

  // ─── resolveMonth ──────────────────────────────────────────────────────────
  describe('resolveMonth', () => {
    it('returns the current month name when month is undefined', () => {
      const date = new Date(2024, 5, 1); // June 2024
      const result = priv.resolveMonth(undefined, date);
      expect(result).toBe('Junio');
    });

    it('converts numeric month string to name', () => {
      const result = priv.resolveMonth('1', new Date());
      expect(result).toBe('Enero');
    });

    it('converts numeric month 12 to Diciembre', () => {
      expect(priv.resolveMonth('12', new Date())).toBe('Diciembre');
    });

    it('accepts a lowercase month name and returns the canonical form', () => {
      expect(priv.resolveMonth('marzo', new Date())).toBe('Marzo');
    });

    it('accepts a properly-cased month name', () => {
      expect(priv.resolveMonth('Agosto', new Date())).toBe('Agosto');
    });

    it('throws BadRequestException for month number < 1', () => {
      expect(() => priv.resolveMonth('0', new Date())).toThrow(BadRequestException);
    });

    it('throws BadRequestException for month number > 12', () => {
      expect(() => priv.resolveMonth('13', new Date())).toThrow(BadRequestException);
    });

    it('throws BadRequestException for an invalid month string', () => {
      expect(() => priv.resolveMonth('mayo_invalid', new Date())).toThrow(BadRequestException);
    });
  });

  // ─── resolveYear ──────────────────────────────────────────────────────────
  describe('resolveYear', () => {
    it('returns the current year when year is undefined', () => {
      const date = new Date(2024, 0, 1);
      expect(priv.resolveYear(undefined, date)).toBe(2024);
    });

    it('parses a numeric string to a year integer', () => {
      expect(priv.resolveYear('2025', new Date())).toBe(2025);
    });

    it('accepts a number directly', () => {
      expect(priv.resolveYear(2023, new Date())).toBe(2023);
    });

    it('throws BadRequestException for year below 1900', () => {
      expect(() => priv.resolveYear(1899, new Date())).toThrow(BadRequestException);
    });

    it('throws BadRequestException for year above 3000', () => {
      expect(() => priv.resolveYear(3001, new Date())).toThrow(BadRequestException);
    });

    it('throws BadRequestException for a non-numeric string', () => {
      expect(() => priv.resolveYear('veinte-veinte', new Date())).toThrow(BadRequestException);
    });
  });

  // ─── resolveBudgetName ─────────────────────────────────────────────────────
  describe('resolveBudgetName', () => {
    it('returns the provided name when given', () => {
      expect(priv.resolveBudgetName('Junio', 2024, 'Mi Presupuesto')).toBe('Mi Presupuesto');
    });

    it('generates the default name when name is not provided', () => {
      expect(priv.resolveBudgetName('Junio', 2024)).toBe('Presupuesto_Junio_de_2024');
    });

    it('generates default name when name is undefined', () => {
      expect(priv.resolveBudgetName('Enero', 2025, undefined)).toBe('Presupuesto_Enero_de_2025');
    });
  });

  // ─── buildBudgetFromSource ─────────────────────────────────────────────────
  describe('buildBudgetFromSource', () => {
    it('clones limits and strategy from the source budget', () => {
      const source = makeBudget({
        needsLimit: 45,
        wantsLimit: 25,
        savingsLimit: 30,
        strategy: 'CUSTOM',
      });
      const result = priv.buildBudgetFromSource(source, 'user-2', 'finances-2', 'Julio', 2024);

      expect(result.needsLimit).toBe(45);
      expect(result.wantsLimit).toBe(25);
      expect(result.savingsLimit).toBe(30);
      expect(result.strategy).toBe('CUSTOM');
    });

    it('always sets status to PLANNED regardless of source status', () => {
      const source = makeBudget({ status: 'CLOSED' });
      const result = priv.buildBudgetFromSource(source, 'user-2', 'finances-2', 'Agosto', 2024);
      expect(result.status).toBe('PLANNED');
    });

    it('uses the provided name when supplied', () => {
      const source = makeBudget();
      const result = priv.buildBudgetFromSource(
        source,
        'user-2',
        'finances-2',
        'Julio',
        2024,
        'Custom',
      );
      expect(result.name).toBe('Custom');
    });

    it('sets the correct ownerId and financesId from inputs, not from source', () => {
      const source = makeBudget({ ownerId: 'source-user', financesId: 'source-finances' });
      const result = priv.buildBudgetFromSource(source, 'new-user', 'new-finances', 'Julio', 2024);
      expect(result.ownerId).toBe('new-user');
      expect(result.financesId).toBe('new-finances');
    });
  });

  // ─── createMonthlyBudget ───────────────────────────────────────────────────
  describe('createMonthlyBudget', () => {
    it('throws NotFoundException when finances not found', async () => {
      mockFinancesRepo.findByUserId.mockResolvedValue(null);

      await expect(
        service.createMonthlyBudget({ userId: 'u-1', month: '6', year: '2024', mode: 'empty' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when a budget already exists for that month/year', async () => {
      mockFinancesRepo.findByUserId.mockResolvedValue({ id: 'finances-1' });
      mockBudgetRepo.findByFinancesIdAndMonth.mockResolvedValue(makeBudget());

      await expect(
        service.createMonthlyBudget({ userId: 'u-1', month: '6', year: '2024', mode: 'empty' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates an empty budget and returns it', async () => {
      mockFinancesRepo.findByUserId.mockResolvedValue({ id: 'finances-1' });
      mockBudgetRepo.findByFinancesIdAndMonth.mockResolvedValue(null);
      mockBudgetRepo.save.mockResolvedValue(makeBudget());

      const result = await service.createMonthlyBudget({
        userId: 'u-1',
        month: '6',
        year: '2024',
        mode: 'empty',
      });

      expect(mockBudgetRepo.save).toHaveBeenCalledTimes(1);
      expect(result.month).toBe('Junio');
    });
  });

  // ─── getAllBudgetsByUserId ──────────────────────────────────────────────────
  describe('getAllBudgetsByUserId', () => {
    it('throws NotFoundException when finances not found', async () => {
      mockFinancesRepo.findByUserId.mockResolvedValue(null);
      await expect(service.getAllBudgetsByUserId('u-1')).rejects.toThrow(NotFoundException);
    });

    it('returns all budgets for the user', async () => {
      mockFinancesRepo.findByUserId.mockResolvedValue({ id: 'finances-1' });
      mockBudgetRepo.findAllByFinancesId.mockResolvedValue([makeBudget()]);

      const result = await service.getAllBudgetsByUserId('u-1');
      expect(result).toHaveLength(1);
      expect(mockBudgetRepo.findAllByFinancesId).toHaveBeenCalledWith('finances-1', undefined);
    });
  });

  // ─── getBudgetById ─────────────────────────────────────────────────────────
  describe('getBudgetById', () => {
    it('throws NotFoundException when budget does not exist', async () => {
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.getBudgetById('b-missing')).rejects.toThrow(NotFoundException);
    });

    it('returns the budget when it exists and no userId provided', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      const result = await service.getBudgetById('budget-1');
      expect(result.id).toBe('budget-1');
    });

    it('throws NotFoundException when userId does not own the budget', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'other-user' }));
      await expect(service.getBudgetById('budget-1', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('returns the budget when userId matches the owner', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'u-1' }));
      const result = await service.getBudgetById('budget-1', 'u-1');
      expect(result.ownerId).toBe('u-1');
    });
  });

  // ─── updateBudget ──────────────────────────────────────────────────────────
  describe('updateBudget', () => {
    it('throws NotFoundException when repository update returns null', async () => {
      mockBudgetRepo.update.mockResolvedValue(null);
      await expect(service.updateBudget('b-1', { name: 'Nuevo' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the updated budget', async () => {
      const updated = makeBudget({ name: 'Nuevo Nombre' });
      mockBudgetRepo.update.mockResolvedValue(updated);

      const result = await service.updateBudget('b-1', { name: 'Nuevo Nombre' });
      expect(result.name).toBe('Nuevo Nombre');
    });
  });

  // ─── deleteCustomBucket ────────────────────────────────────────────────────
  describe('deleteCustomBucket', () => {
    it('throws NotFoundException when budget not owned by user', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'other' }));
      await expect(service.deleteCustomBucket('b-1', 'bk-1', 'u-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when bucket does not exist in budget', async () => {
      mockBudgetRepo.findById.mockResolvedValue(
        makeBudget({
          ownerId: 'u-1',
          customBuckets: [{ id: 'bk-other', name: 'Otro', percentage: 5 }],
        }),
      );
      await expect(service.deleteCustomBucket('b-1', 'bk-1', 'u-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('removes the bucket and saves the updated budget', async () => {
      const budget = makeBudget({
        ownerId: 'u-1',
        customBuckets: [
          { id: 'bk-1', name: 'Vacaciones', percentage: 10 },
          { id: 'bk-2', name: 'Emergencias', percentage: 5 },
        ],
      });
      mockBudgetRepo.findById.mockResolvedValue(budget);
      mockBudgetRepo.update.mockResolvedValue(
        makeBudget({
          ownerId: 'u-1',
          customBuckets: [{ id: 'bk-2', name: 'Emergencias', percentage: 5 }],
        }),
      );

      const result = await service.deleteCustomBucket('b-1', 'bk-1', 'u-1');

      expect(mockBudgetRepo.update).toHaveBeenCalledWith(
        'b-1',
        expect.objectContaining({
          customBuckets: [{ id: 'bk-2', name: 'Emergencias', percentage: 5 }],
        }),
      );
      expect(result).toBeDefined();
    });
  });
});
