import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';

import { AccountsPayableService } from '../../../accounts-payable/application/accounts-payable.service';
import { Budget } from '../../../budgets/domain/budget';
import { HealthLevel } from '../../domain/financial-health-score';
import { FinancialHealthService } from '../financial-health.service';

// ─── Typed interface exposing private calculation methods for testing ─────────
interface FinancialHealthCalculations {
  calcCashFlow(income: number, expenses: number): { score: number; rate: number };
  calcSavings(actual: number, planned: number): { score: number; rate: number };
  calcExpenses(actual: number, planned: number): { score: number; excessPct: number };
  calcDti(debt: number, income: number): number;
  calcDebtScore(debt: number, income: number): number;
  averagePillars(pillars: object[]): object;
  resolveLevel(score: number): HealthLevel;
  resolveLevelLabel(level: HealthLevel): string;
  cashFlowLabel(score: number): string;
  savingsLabel(score: number): string;
  expensesLabel(score: number): string;
  debtLabel(score: number): string;
  findWeakestPillarName(cf: number, sv: number, ex: number, dt: number): string;
  buildInsight(total: number, cf: number, sv: number, ex: number, dt: number): string;
  buildDebtRatio(dti: number, debt: number, annualIncome: number): object;
  selectLastThree(budgets: Budget[]): Budget[];
}

// ─── Minimal stubs — private-method tests do not hit any repository ──────────
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};
const mockScoreRepo = { findRecentByUserId: jest.fn(), insert: jest.fn() };
const mockFinancesRepo = { findByUserId: jest.fn() };
const mockBudgetRepo = { findAllByFinancesId: jest.fn() };
const mockPlannedExpenseRepo = { findByBudget: jest.fn() };
const mockPlannedSavingRepo = { findByBudget: jest.fn() };
const mockTransactionRepo = { findByBudget: jest.fn() };
const mockApService = { getSummary: jest.fn() };

describe('FinancialHealthService — pure calculation methods', () => {
  let svc: FinancialHealthCalculations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialHealthService,
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: 'FinancialHealthScoreRepository', useValue: mockScoreRepo },
        { provide: 'FinancesRepository', useValue: mockFinancesRepo },
        { provide: 'BudgetRepository', useValue: mockBudgetRepo },
        { provide: 'PlannedExpenseRepository', useValue: mockPlannedExpenseRepo },
        { provide: 'PlannedSavingRepository', useValue: mockPlannedSavingRepo },
        { provide: 'TransactionRepository', useValue: mockTransactionRepo },
        { provide: AccountsPayableService, useValue: mockApService },
      ],
    }).compile();

    svc = module.get<FinancialHealthService>(
      FinancialHealthService,
    ) as unknown as FinancialHealthCalculations;
  });

  // ─── calcCashFlow ──────────────────────────────────────────────────────────
  describe('calcCashFlow', () => {
    it('returns 0 when income is 0', () => {
      expect(svc.calcCashFlow(0, 500)).toEqual({ score: 0, rate: 0 });
    });

    it('returns score 25 when net flow is >= 30% of income', () => {
      // rate = (1000 - 690) / 1000 * 100 = 31%
      expect(svc.calcCashFlow(1000, 690)).toEqual({ score: 25, rate: 31 });
    });

    it('returns score 20 when net flow is between 15% and 30%', () => {
      // rate = (1000 - 820) / 1000 * 100 = 18%
      expect(svc.calcCashFlow(1000, 820)).toEqual({ score: 20, rate: 18 });
    });

    it('returns score 12 when net flow is between 5% and 15%', () => {
      // rate = (1000 - 920) / 1000 * 100 = 8%
      expect(svc.calcCashFlow(1000, 920)).toEqual({ score: 12, rate: 8 });
    });

    it('returns score 5 when net flow is between 1% and 5%', () => {
      // rate = (1000 - 975) / 1000 * 100 = 2.5%
      expect(svc.calcCashFlow(1000, 975)).toEqual({ score: 5, rate: 2.5 });
    });

    it('returns score 0 when expenses exceed income (negative flow)', () => {
      // rate = (1000 - 1200) / 1000 * 100 = -20%
      expect(svc.calcCashFlow(1000, 1200)).toEqual({ score: 0, rate: -20 });
    });

    it('returns rate exactly 30 with score 25 at boundary', () => {
      // rate = (1000 - 700) / 1000 = 30%
      expect(svc.calcCashFlow(1000, 700)).toEqual({ score: 25, rate: 30 });
    });
  });

  // ─── calcSavings ──────────────────────────────────────────────────────────
  describe('calcSavings', () => {
    it('returns 0 when planned savings is 0', () => {
      expect(svc.calcSavings(500, 0)).toEqual({ score: 0, rate: 0 });
    });

    it('returns score 25 when actual >= 100% of planned', () => {
      expect(svc.calcSavings(1000, 1000)).toEqual({ score: 25, rate: 100 });
    });

    it('returns score 25 when actual exceeds planned', () => {
      expect(svc.calcSavings(1200, 1000)).toEqual({ score: 25, rate: 120 });
    });

    it('returns score 20 when fulfillment is between 80% and 100%', () => {
      // 850 / 1000 = 85%
      expect(svc.calcSavings(850, 1000)).toEqual({ score: 20, rate: 85 });
    });

    it('returns score 12 when fulfillment is between 50% and 80%', () => {
      // 600 / 1000 = 60%
      expect(svc.calcSavings(600, 1000)).toEqual({ score: 12, rate: 60 });
    });

    it('returns score 5 when fulfillment is between 20% and 50%', () => {
      // 300 / 1000 = 30%
      expect(svc.calcSavings(300, 1000)).toEqual({ score: 5, rate: 30 });
    });

    it('returns score 0 when fulfillment is below 20%', () => {
      // 100 / 1000 = 10%
      expect(svc.calcSavings(100, 1000)).toEqual({ score: 0, rate: 10 });
    });
  });

  // ─── calcExpenses ──────────────────────────────────────────────────────────
  describe('calcExpenses', () => {
    it('returns score 25 with excessPct 0 when both are 0', () => {
      expect(svc.calcExpenses(0, 0)).toEqual({ score: 25, excessPct: 0 });
    });

    it('returns score 0 with excessPct 100 when planned is 0 but actual > 0', () => {
      expect(svc.calcExpenses(500, 0)).toEqual({ score: 0, excessPct: 100 });
    });

    it('returns score 25 when actual equals planned (no excess)', () => {
      expect(svc.calcExpenses(1000, 1000)).toEqual({ score: 25, excessPct: 0 });
    });

    it('returns score 25 when actual is below planned', () => {
      expect(svc.calcExpenses(800, 1000)).toEqual({ score: 25, excessPct: 0 });
    });

    it('returns score 15 when excess is between 0% and 10%', () => {
      // excess = 1050 - 1000 = 50 → 50/1000 = 5%
      expect(svc.calcExpenses(1050, 1000)).toEqual({ score: 15, excessPct: 5 });
    });

    it('returns score 8 when excess is between 10% and 25%', () => {
      // excess = 1200 - 1000 = 200 → 200/1000 = 20%
      expect(svc.calcExpenses(1200, 1000)).toEqual({ score: 8, excessPct: 20 });
    });

    it('returns score 0 when excess exceeds 25%', () => {
      // excess = 1400 - 1000 = 400 → 400/1000 = 40%
      expect(svc.calcExpenses(1400, 1000)).toEqual({ score: 0, excessPct: 40 });
    });
  });

  // ─── calcDti ───────────────────────────────────────────────────────────────
  describe('calcDti', () => {
    it('returns 0 when debt is 0', () => {
      expect(svc.calcDti(0, 5000)).toBe(0);
    });

    it('returns 200 when debt > 0 and income is 0', () => {
      expect(svc.calcDti(10000, 0)).toBe(200);
    });

    it('calculates DTI correctly', () => {
      // debt = 12000, annual income = 2000 * 12 = 24000 → DTI = 50%
      expect(svc.calcDti(12000, 2000)).toBe(50);
    });

    it('rounds DTI to 2 decimal places', () => {
      // debt = 1000, annual income = 1000 * 12 = 12000 → 1000/12000 = 8.333...%
      expect(svc.calcDti(1000, 1000)).toBe(8.33);
    });
  });

  // ─── calcDebtScore ─────────────────────────────────────────────────────────
  describe('calcDebtScore', () => {
    it('returns 25 when there is no debt', () => {
      expect(svc.calcDebtScore(0, 5000)).toBe(25);
    });

    it('returns 25 when DTI is below 20%', () => {
      // DTI = 1000 / (1000*12) = 8.33% < 20
      expect(svc.calcDebtScore(1000, 1000)).toBe(25);
    });

    it('returns 20 when DTI is between 20% and 36%', () => {
      // DTI = 6000 / (2000*12) = 25%
      expect(svc.calcDebtScore(6000, 2000)).toBe(20);
    });

    it('returns 12 when DTI is between 36% and 50%', () => {
      // DTI = 9000 / (2000*12) = 37.5%
      expect(svc.calcDebtScore(9000, 2000)).toBe(12);
    });

    it('returns 5 when DTI is between 50% and 75%', () => {
      // DTI = 15000 / (2000*12) = 62.5%
      expect(svc.calcDebtScore(15000, 2000)).toBe(5);
    });

    it('returns 0 when DTI exceeds 75%', () => {
      // DTI = 30000 / (2000*12) = 125%
      expect(svc.calcDebtScore(30000, 2000)).toBe(0);
    });
  });

  // ─── resolveLevel ──────────────────────────────────────────────────────────
  describe('resolveLevel', () => {
    it.each([
      [0, 'critical'],
      [19, 'critical'],
      [20, 'precarious'],
      [39, 'precarious'],
      [40, 'at_risk'],
      [59, 'at_risk'],
      [60, 'regular'],
      [74, 'regular'],
      [75, 'healthy'],
      [89, 'healthy'],
      [90, 'optimal'],
      [100, 'optimal'],
    ])('score %i → level "%s"', (score, expected) => {
      expect(svc.resolveLevel(score)).toBe(expected);
    });
  });

  // ─── resolveLevelLabel ─────────────────────────────────────────────────────
  describe('resolveLevelLabel', () => {
    it.each([
      ['critical', 'Crítico'],
      ['precarious', 'Precario'],
      ['at_risk', 'En riesgo'],
      ['regular', 'Regular'],
      ['healthy', 'Saludable'],
      ['optimal', 'Óptimo'],
    ] as [HealthLevel, string][])('level "%s" → label "%s"', (level, expected) => {
      expect(svc.resolveLevelLabel(level)).toBe(expected);
    });
  });

  // ─── pillar labels ─────────────────────────────────────────────────────────
  describe('cashFlowLabel', () => {
    it.each([
      [25, 'Óptimo'],
      [20, 'Saludable'],
      [12, 'Ajustado'],
      [5, 'Muy ajustado'],
      [0, 'Negativo'],
    ])('score %i → "%s"', (score, expected) => {
      expect(svc.cashFlowLabel(score)).toBe(expected);
    });
  });

  describe('savingsLabel', () => {
    it.each([
      [25, 'Meta cumplida'],
      [20, 'Casi en meta'],
      [12, 'A mitad'],
      [5, 'Insuficiente'],
      [0, 'Sin ahorro'],
    ])('score %i → "%s"', (score, expected) => {
      expect(svc.savingsLabel(score)).toBe(expected);
    });
  });

  describe('expensesLabel', () => {
    it.each([
      [25, 'Dentro del plan'],
      [15, 'Ligeramente sobre'],
      [8, 'Sobre el plan'],
      [0, 'Muy sobre el plan'],
    ])('score %i → "%s"', (score, expected) => {
      expect(svc.expensesLabel(score)).toBe(expected);
    });
  });

  describe('debtLabel', () => {
    it.each([
      [25, 'Sin deuda'],
      [20, 'Manejable'],
      [12, 'Moderada'],
      [5, 'Alta'],
      [0, 'Crítica'],
    ])('score %i → "%s"', (score, expected) => {
      expect(svc.debtLabel(score)).toBe(expected);
    });
  });

  // ─── findWeakestPillarName ─────────────────────────────────────────────────
  describe('findWeakestPillarName', () => {
    it('identifies cash flow as the weakest pillar', () => {
      expect(svc.findWeakestPillarName(0, 20, 20, 20)).toBe('Flujo de Caja');
    });

    it('identifies savings as the weakest pillar', () => {
      expect(svc.findWeakestPillarName(20, 0, 20, 20)).toBe('Ahorro');
    });

    it('identifies expenses as the weakest pillar', () => {
      expect(svc.findWeakestPillarName(20, 20, 0, 20)).toBe('Gastos');
    });

    it('identifies debt as the weakest pillar', () => {
      expect(svc.findWeakestPillarName(20, 20, 20, 0)).toBe('Deudas');
    });

    it('returns the first in sort order when two pillars tie at the bottom', () => {
      // Both cash flow and savings are 0; cash flow sorts first alphabetically
      const result = svc.findWeakestPillarName(0, 0, 20, 20);
      expect(['Flujo de Caja', 'Ahorro']).toContain(result);
    });
  });

  // ─── buildInsight ──────────────────────────────────────────────────────────
  describe('buildInsight', () => {
    it('returns empty string when totalScore is 0', () => {
      expect(svc.buildInsight(0, 0, 0, 0, 0)).toBe('');
    });

    it('returns "mayor área de mejora" message when score >= 75', () => {
      const result = svc.buildInsight(75, 25, 25, 0, 25);
      expect(result).toContain('mayor área de mejora');
      expect(result).toContain('Gastos');
    });

    it('returns "Enfoca tu atención" message when score is between 40 and 74', () => {
      const result = svc.buildInsight(50, 20, 20, 0, 10);
      expect(result).toContain('Enfoca tu atención');
      expect(result).toContain('Gastos');
    });

    it('returns "requiere atención" message when score is below 40', () => {
      const result = svc.buildInsight(20, 0, 20, 0, 0);
      expect(result).toContain('requiere atención');
    });
  });

  // ─── buildDebtRatio ────────────────────────────────────────────────────────
  describe('buildDebtRatio', () => {
    it('returns zero-debt response when totalDebt is 0', () => {
      const result = svc.buildDebtRatio(0, 0, 60000) as Record<string, unknown>;
      expect(result.ratio).toBe(0);
      expect(result.label).toBe('Sin deudas');
      expect(result.badge).toBe('success');
      expect(result.totalDebt).toBe(0);
    });

    it('returns "Excelente" label when DTI < 20', () => {
      const result = svc.buildDebtRatio(10, 5000, 60000) as Record<string, unknown>;
      expect(result.label).toBe('Excelente');
      expect(result.badge).toBe('success');
    });

    it('returns "Saludable" label when DTI is between 20 and 36', () => {
      const result = svc.buildDebtRatio(25, 10000, 60000) as Record<string, unknown>;
      expect(result.label).toBe('Saludable');
      expect(result.badge).toBe('primary');
    });

    it('returns "Atención" label when DTI is between 36 and 50', () => {
      const result = svc.buildDebtRatio(40, 20000, 60000) as Record<string, unknown>;
      expect(result.label).toBe('Atención');
      expect(result.badge).toBe('warning');
    });

    it('returns "Alto riesgo" label when DTI is between 50 and 75', () => {
      const result = svc.buildDebtRatio(60, 30000, 60000) as Record<string, unknown>;
      expect(result.label).toBe('Alto riesgo');
      expect(result.badge).toBe('danger');
    });

    it('returns "Crítico" label when DTI exceeds 75', () => {
      const result = svc.buildDebtRatio(80, 50000, 60000) as Record<string, unknown>;
      expect(result.label).toBe('Crítico');
      expect(result.badge).toBe('danger');
    });

    it('includes totalDebt and annualIncomeEstimate in the response', () => {
      const result = svc.buildDebtRatio(10, 5000, 60000) as Record<string, unknown>;
      expect(result.totalDebt).toBe(5000);
      expect(result.annualIncomeEstimate).toBe(60000);
    });
  });

  // ─── selectLastThree ───────────────────────────────────────────────────────
  describe('selectLastThree', () => {
    const makeBudget = (year: number, month: string): Budget =>
      ({ id: `${year}-${month}`, year, month }) as Budget;

    it('returns at most 3 budgets', () => {
      const budgets = [
        makeBudget(2024, 'enero'),
        makeBudget(2024, 'febrero'),
        makeBudget(2024, 'marzo'),
        makeBudget(2024, 'abril'),
        makeBudget(2024, 'mayo'),
      ];
      expect(svc.selectLastThree(budgets)).toHaveLength(3);
    });

    it('returns the 3 most recent budgets ordered by year desc then month desc', () => {
      const budgets = [
        makeBudget(2023, 'enero'),
        makeBudget(2024, 'enero'),
        makeBudget(2024, 'marzo'),
        makeBudget(2024, 'febrero'),
      ];
      const result = svc.selectLastThree(budgets);
      expect(result[0].month).toBe('marzo');
      expect(result[1].month).toBe('febrero');
      expect(result[2].month).toBe('enero');
      expect(result[2].year).toBe(2024);
    });

    it('prioritises newer year over any month', () => {
      const budgets = [makeBudget(2023, 'diciembre'), makeBudget(2024, 'enero')];
      const result = svc.selectLastThree(budgets);
      expect(result[0].year).toBe(2024);
    });

    it('returns all budgets when there are fewer than 3', () => {
      const budgets = [makeBudget(2024, 'enero'), makeBudget(2024, 'febrero')];
      expect(svc.selectLastThree(budgets)).toHaveLength(2);
    });

    it('does not mutate the original array', () => {
      const budgets = [makeBudget(2024, 'marzo'), makeBudget(2024, 'enero')];
      const copy = [...budgets];
      svc.selectLastThree(budgets);
      expect(budgets).toEqual(copy);
    });
  });

  // ─── averagePillars ────────────────────────────────────────────────────────
  describe('averagePillars', () => {
    it('averages cashFlowScore across pillars', () => {
      const pillars = [
        {
          cashFlowScore: 20,
          cashFlowRate: 20,
          savingsScore: 10,
          savingsRate: 50,
          expenseScore: 15,
          expensesExcessPct: 5,
          totalTransactions: 10,
          avgMonthlyIncome: 1000,
          totalIncome: 1000,
          totalExpenses: 800,
          totalSavings: 200,
        },
        {
          cashFlowScore: 0,
          cashFlowRate: 0,
          savingsScore: 10,
          savingsRate: 50,
          expenseScore: 15,
          expensesExcessPct: 5,
          totalTransactions: 5,
          avgMonthlyIncome: 500,
          totalIncome: 500,
          totalExpenses: 400,
          totalSavings: 100,
        },
      ];
      const result = svc.averagePillars(pillars) as Record<string, unknown>;
      expect(result.cashFlowScore).toBe(10); // (20 + 0) / 2
    });

    it('sums totalTransactions rather than averaging them', () => {
      const pillars = [
        {
          cashFlowScore: 0,
          cashFlowRate: 0,
          savingsScore: 0,
          savingsRate: 0,
          expenseScore: 0,
          expensesExcessPct: 0,
          totalTransactions: 10,
          avgMonthlyIncome: 0,
          totalIncome: 0,
          totalExpenses: 0,
          totalSavings: 0,
        },
        {
          cashFlowScore: 0,
          cashFlowRate: 0,
          savingsScore: 0,
          savingsRate: 0,
          expenseScore: 0,
          expensesExcessPct: 0,
          totalTransactions: 5,
          avgMonthlyIncome: 0,
          totalIncome: 0,
          totalExpenses: 0,
          totalSavings: 0,
        },
      ];
      const result = svc.averagePillars(pillars) as Record<string, unknown>;
      expect(result.totalTransactions).toBe(15);
    });

    it('returns correct values for a single pillar', () => {
      const pillars = [
        {
          cashFlowScore: 25,
          cashFlowRate: 35,
          savingsScore: 20,
          savingsRate: 85,
          expenseScore: 15,
          expensesExcessPct: 5,
          totalTransactions: 8,
          avgMonthlyIncome: 2000,
          totalIncome: 2000,
          totalExpenses: 1200,
          totalSavings: 400,
        },
      ];
      const result = svc.averagePillars(pillars) as Record<string, unknown>;
      expect(result.cashFlowScore).toBe(25);
      expect(result.savingsScore).toBe(20);
    });
  });
});
