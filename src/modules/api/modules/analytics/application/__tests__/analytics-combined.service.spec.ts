import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';
import { AccountsPayableService } from '@/modules/api/modules/accounts-payable/application/accounts-payable.service';
import { AccountsReceivableService } from '@/modules/api/modules/accounts-receivable/application/accounts-receivable.service';

import { AnalyticsCombinedService } from '../analytics-combined.service';

const mockApService = { getSummary: jest.fn(), findAll: jest.fn() };
const mockArService = { getSummary: jest.fn() };
const mockFinancesRepo = { findByUserId: jest.fn() };
const mockBudgetRepo = { findByFinancesIdAndMonth: jest.fn() };
const mockPlannedIncomeRepo = { findByBudgetId: jest.fn() };
const mockPlannedExpenseRepo = { findByBudget: jest.fn() };
const mockPlannedSavingRepo = { findCompletedLast6MonthsByUserId: jest.fn() };
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makeApSummary = () => ({
  totalDebt: 2000000,
  monthlyCommitments: 300000,
  debtToIncomeRatio: 0.4,
  overdueCount: 1,
  nextDueDate: null,
  byType: {},
});

const makeArSummary = () => ({
  totalReceivable: 500000,
  expectedThisMonth: 100000,
  overdueCount: 0,
});

describe('AnalyticsCombinedService', () => {
  let service: AnalyticsCombinedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsCombinedService,
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: AccountsPayableService, useValue: mockApService },
        { provide: AccountsReceivableService, useValue: mockArService },
        { provide: 'FinancesRepository', useValue: mockFinancesRepo },
        { provide: 'BudgetRepository', useValue: mockBudgetRepo },
        { provide: 'PlannedIncomeRepository', useValue: mockPlannedIncomeRepo },
        { provide: 'PlannedExpenseRepository', useValue: mockPlannedExpenseRepo },
        { provide: 'PlannedSavingRepository', useValue: mockPlannedSavingRepo },
      ],
    }).compile();

    service = module.get<AnalyticsCombinedService>(AnalyticsCombinedService);
    jest.clearAllMocks();
  });

  // ─── getNetPosition ────────────────────────────────────────────────────────
  describe('getNetPosition', () => {
    it('returns net position with active budget', async () => {
      mockApService.getSummary.mockResolvedValue(makeApSummary());
      mockArService.getSummary.mockResolvedValue(makeArSummary());
      mockFinancesRepo.findByUserId.mockResolvedValue({ id: 'finance-1' });
      mockBudgetRepo.findByFinancesIdAndMonth.mockResolvedValue({ id: 'budget-1' });
      mockPlannedIncomeRepo.findByBudgetId.mockResolvedValue([{ amount: 5000000 }]);
      mockPlannedExpenseRepo.findByBudget.mockResolvedValue([{ expectedAmount: 2000000 }]);

      const result = await service.getNetPosition('user-1');

      expect(result.totalDebts).toBe(2000000);
      expect(result.totalReceivable).toBe(500000);
      expect(result.totalAssets).toBe(3000000); // 5M income - 2M expenses
    });

    it('returns zero totalAssets when no active budget', async () => {
      mockApService.getSummary.mockResolvedValue(makeApSummary());
      mockArService.getSummary.mockResolvedValue(makeArSummary());
      mockFinancesRepo.findByUserId.mockResolvedValue(null);
      mockBudgetRepo.findByFinancesIdAndMonth.mockResolvedValue(null);

      const result = await service.getNetPosition('user-1');

      expect(result.totalAssets).toBe(0);
    });

    it('wraps errors in InternalServerErrorException', async () => {
      mockApService.getSummary.mockRejectedValue(new Error('DB error'));
      await expect(service.getNetPosition('user-1')).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ─── getDebtProjection ─────────────────────────────────────────────────────
  describe('getDebtProjection', () => {
    it('returns 6-month projection', async () => {
      mockApService.findAll.mockResolvedValue([
        {
          currentBalance: '1000000',
          originalAmount: '1500000',
          status: 'active',
          minimumPayment: '100000',
        },
      ]);

      const result = await service.getDebtProjection('user-1');

      expect(result.projection).toHaveLength(6);
      expect(result.simplified).toBe(true);
      expect(result.hasPaymentHistory).toBe(true);
    });

    it('returns hasPaymentHistory=false when no payments made', async () => {
      mockApService.findAll.mockResolvedValue([
        {
          currentBalance: '1000000',
          originalAmount: '1000000',
          status: 'active',
          minimumPayment: null,
        },
      ]);

      const result = await service.getDebtProjection('user-1');

      expect(result.hasPaymentHistory).toBe(false);
    });

    it('wraps errors in InternalServerErrorException', async () => {
      mockApService.findAll.mockRejectedValue(new Error('DB error'));
      await expect(service.getDebtProjection('user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ─── getSavingsTrend ───────────────────────────────────────────────────────
  describe('getSavingsTrend', () => {
    it('returns savings trend', async () => {
      const trend = [{ month: 'Jan', amount: 500000 }];
      mockPlannedSavingRepo.findCompletedLast6MonthsByUserId.mockResolvedValue(trend);

      const result = await service.getSavingsTrend('user-1');

      expect(result.trend).toEqual(trend);
    });

    it('wraps errors in InternalServerErrorException', async () => {
      mockPlannedSavingRepo.findCompletedLast6MonthsByUserId.mockRejectedValue(
        new Error('DB error'),
      );
      await expect(service.getSavingsTrend('user-1')).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ─── getCashFlowForecast ───────────────────────────────────────────────────
  describe('getCashFlowForecast', () => {
    it('returns 3-month cash flow forecast', async () => {
      mockArService.getSummary.mockResolvedValue(makeArSummary());
      mockFinancesRepo.findByUserId.mockResolvedValue({ id: 'finance-1' });
      mockBudgetRepo.findByFinancesIdAndMonth.mockResolvedValue({ id: 'budget-1' });
      mockPlannedIncomeRepo.findByBudgetId.mockResolvedValue([{ amount: 4000000 }]);
      mockPlannedExpenseRepo.findByBudget.mockResolvedValue([{ expectedAmount: 2000000 }]);

      const result = await service.getCashFlowForecast('user-1');

      expect(result.months).toHaveLength(3);
      expect(result.assumptions.basedOnBudget).toBe(true);
    });

    it('returns forecast without active budget', async () => {
      mockArService.getSummary.mockResolvedValue(makeArSummary());
      mockFinancesRepo.findByUserId.mockResolvedValue(null);
      mockBudgetRepo.findByFinancesIdAndMonth.mockResolvedValue(null);

      const result = await service.getCashFlowForecast('user-1');

      expect(result.months).toHaveLength(3);
      expect(result.assumptions.basedOnBudget).toBe(false);
    });

    it('wraps errors in InternalServerErrorException', async () => {
      mockArService.getSummary.mockRejectedValue(new Error('DB error'));
      await expect(service.getCashFlowForecast('user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
