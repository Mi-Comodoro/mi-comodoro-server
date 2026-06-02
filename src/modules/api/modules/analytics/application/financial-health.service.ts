import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { AccountsPayableService } from '../../accounts-payable/application/accounts-payable.service';
import { Budget } from '../../budgets/domain/budget';
import { BudgetRepository } from '../../budgets/domain/repositories/budget.repository';
import { PlannedExpenseStatus } from '../../expenses/domain/expenses';
import { PlannedExpenseRepository } from '../../expenses/domain/repositories/expense-planned.repository';
import { FinancesRepository } from '../../finances/domain/repositories/finances.repository';
import { PlannedSavingRepository } from '../../savings/domain/repositories/planned.repository';
import { PlannedSavingStatus } from '../../savings/domain/savings-planned';
import { TransactionRepository } from '../../transactions/domain/repositories/transaction.repository';
import { HealthLevel } from '../domain/financial-health-score';
import { FinancialHealthScoreRepository } from '../domain/repositories/financial-health-score.repository';

export interface HealthScoreFullResponse {
  score: {
    total: number;
    label: string;
    pillars: {
      cashFlow: { score: number; max: number; rate: number; label: string };
      savings: { score: number; max: number; rate: number; label: string };
      expenses: { score: number; max: number; excessPct: number; label: string };
      debt: { score: number; max: number; dti: number; label: string };
    };
    insight: string;
    weakestPillar: string;
  };
  debtRatio: {
    ratio: number;
    label: string;
    badge: string;
    totalDebt: number;
    annualIncomeEstimate: number;
  };
  totalTransactions: number;
  totals: {
    income: number;
    expenses: number;
    savings: number;
  };
}

interface PillarResult {
  cashFlowScore: number;
  cashFlowRate: number;
  savingsScore: number;
  savingsRate: number;
  expenseScore: number;
  expensesExcessPct: number;
  totalTransactions: number;
  avgMonthlyIncome: number;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
}

@Injectable()
export class FinancialHealthService {
  private readonly context = FinancialHealthService.name;

  private readonly monthOrder: Record<string, number> = {
    enero: 1,
    febrero: 2,
    marzo: 3,
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    septiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12,
  };

  constructor(
    private readonly logger: LoggerProviderService,
    @Inject('FinancialHealthScoreRepository')
    private readonly scoreRepository: FinancialHealthScoreRepository,
    @Inject('FinancesRepository')
    private readonly financesRepository: FinancesRepository,
    @Inject('BudgetRepository')
    private readonly budgetRepository: BudgetRepository,
    @Inject('PlannedExpenseRepository')
    private readonly plannedExpenseRepository: PlannedExpenseRepository,
    @Inject('PlannedSavingRepository')
    private readonly plannedSavingRepository: PlannedSavingRepository,
    @Inject('TransactionRepository')
    private readonly transactionRepository: TransactionRepository,
    private readonly apService: AccountsPayableService,
  ) {}

  async getOrCalculateScore(userId: string): Promise<HealthScoreFullResponse> {
    const cached = await this.scoreRepository.findRecentByUserId(userId);

    const isStaleCache =
      cached &&
      Number(cached.totalScore) > 0 &&
      Number(cached.totalIncome ?? 0) === 0 &&
      Number(cached.totalExpenses ?? 0) === 0;

    if (
      cached &&
      !isStaleCache &&
      cached.cashFlowRate !== undefined &&
      cached.cashFlowRate !== null &&
      cached.dti !== undefined &&
      cached.dti !== null
    ) {
      this.logger.info(this.context, `Score reciente en cache para usuario ${userId}`);
      return this.buildResponseFromCache(cached);
    }

    return this.calculateScore(userId);
  }

  private buildResponseFromCache(
    cached: Awaited<ReturnType<FinancialHealthScoreRepository['findRecentByUserId']>>,
  ): HealthScoreFullResponse {
    const cashFlowRate = Number(cached!.cashFlowRate ?? 0);
    const savingsRate = Number(cached!.savingsRate ?? 0);
    const excessPct = Number(cached!.expensesExcessPct ?? 0);
    const dti = Number(cached!.dti ?? 0);
    const avgMonthlyIncome = Number(cached!.avgMonthlyIncome ?? 0);
    const totalDebt = avgMonthlyIncome > 0 ? (dti / 100) * avgMonthlyIncome * 12 : 0;

    return {
      score: {
        total: cached!.totalScore,
        label: this.resolveLevelLabel(cached!.level),
        pillars: {
          cashFlow: {
            score: cached!.cashFlowScore,
            max: 25,
            rate: cashFlowRate,
            label: this.cashFlowLabel(cached!.cashFlowScore),
          },
          savings: {
            score: cached!.savingsScore,
            max: 25,
            rate: savingsRate,
            label: this.savingsLabel(cached!.savingsScore),
          },
          expenses: {
            score: cached!.expenseScore,
            max: 25,
            excessPct,
            label: this.expensesLabel(cached!.expenseScore),
          },
          debt: {
            score: cached!.debtScore,
            max: 25,
            dti,
            label: this.debtLabel(cached!.debtScore),
          },
        },
        insight: this.buildInsight(
          cached!.totalScore,
          cached!.cashFlowScore,
          cached!.savingsScore,
          cached!.expenseScore,
          cached!.debtScore,
        ),
        weakestPillar: this.findWeakestPillarName(
          cached!.cashFlowScore,
          cached!.savingsScore,
          cached!.expenseScore,
          cached!.debtScore,
        ),
      },
      debtRatio: this.buildDebtRatio(dti, totalDebt, avgMonthlyIncome * 12),
      totalTransactions: cached!.totalTransactions ?? 0,
      totals: {
        income: Number(cached!.totalIncome ?? 0),
        expenses: Number(cached!.totalExpenses ?? 0),
        savings: Number(cached!.totalSavings ?? 0),
      },
    };
  }

  private async calculateScore(userId: string): Promise<HealthScoreFullResponse> {
    this.logger.info(this.context, `Calculando score financiero para usuario ${userId}`);

    try {
      const finances = await this.financesRepository.findByUserId(userId);
      if (!finances?.id) {
        throw new NotFoundException('Finanzas no encontradas para el usuario');
      }

      const [allBudgets, apSummary] = await Promise.all([
        this.budgetRepository.findAllByFinancesId(finances.id),
        this.apService.getSummary(userId),
      ]);

      this.logger.info(
        this.context,
        `Presupuestos encontrados para financesId=${finances.id}: ${allBudgets.length}`,
      );

      const budgets = this.selectLastThree(allBudgets);
      const totalDebt = apSummary.totalDebt ?? 0;

      if (budgets.length === 0) {
        this.logger.warn(
          this.context,
          `Usuario ${userId} no tiene presupuestos — retornando score base`,
        );

        const avgMonthlyIncome = 0;
        const dti = totalDebt > 0 ? 200 : 0;
        const debtScore = this.calcDebtScore(totalDebt, avgMonthlyIncome);

        await this.scoreRepository.insert({
          userId,
          totalScore: debtScore,
          cashFlowScore: 0,
          savingsScore: 0,
          expenseScore: 0,
          debtScore,
          level: this.resolveLevel(debtScore),
          cashFlowRate: 0,
          savingsRate: 0,
          expensesExcessPct: 0,
          dti,
          avgMonthlyIncome,
          totalTransactions: 0,
        });

        const totalScore = debtScore;
        return {
          score: {
            total: totalScore,
            label: this.resolveLevelLabel(this.resolveLevel(totalScore)),
            pillars: {
              cashFlow: { score: 0, max: 25, rate: 0, label: this.cashFlowLabel(0) },
              savings: { score: 0, max: 25, rate: 0, label: this.savingsLabel(0) },
              expenses: { score: 0, max: 25, excessPct: 0, label: this.expensesLabel(0) },
              debt: { score: debtScore, max: 25, dti, label: this.debtLabel(debtScore) },
            },
            insight: '',
            weakestPillar: '',
          },
          debtRatio: this.buildDebtRatio(dti, totalDebt, avgMonthlyIncome * 12),
          totalTransactions: 0,
          totals: { income: 0, expenses: 0, savings: 0 },
        };
      }

      const pillarsByBudget = await Promise.all(
        budgets.map((budget) => this.calculatePillarsForBudget(budget)),
      );

      const averaged = this.averagePillars(pillarsByBudget);
      const avgMonthlyIncome = averaged.avgMonthlyIncome;
      const dti = this.calcDti(totalDebt, avgMonthlyIncome);
      const debtScore = this.calcDebtScore(totalDebt, avgMonthlyIncome);
      const totalTransactions = pillarsByBudget.reduce((sum, p) => sum + p.totalTransactions, 0);
      const totalIncome = pillarsByBudget.reduce((sum, p) => sum + p.totalIncome, 0);
      const totalExpenses = pillarsByBudget.reduce((sum, p) => sum + p.totalExpenses, 0);
      const totalSavings = pillarsByBudget.reduce((sum, p) => sum + p.totalSavings, 0);

      const totalScore =
        averaged.cashFlowScore + averaged.savingsScore + averaged.expenseScore + debtScore;
      const level = this.resolveLevel(totalScore);

      console.log('[P1] cashFlow score:', averaged.cashFlowScore, 'tasa:', averaged.cashFlowRate);
      console.log(
        '[P2] savings score:',
        averaged.savingsScore,
        'cumplimiento:',
        averaged.savingsRate,
      );
      console.log(
        '[P3] expenses score:',
        averaged.expenseScore,
        'exceso:',
        averaged.expensesExcessPct,
      );
      console.log(
        '[P4] debt score:',
        debtScore,
        'DTI:',
        dti,
        'ingresoAnual:',
        averaged.avgMonthlyIncome * 12,
      );
      console.log('[TOTAL]:', totalScore);

      this.logger.info(
        this.context,
        `Score calculado para usuario ${userId}: total=${totalScore} nivel=${level} dti=${dti} | pillares: cashFlow=${averaged.cashFlowScore} savings=${averaged.savingsScore} expenses=${averaged.expenseScore} debt=${debtScore}`,
      );

      await this.scoreRepository.insert({
        userId,
        totalScore,
        cashFlowScore: averaged.cashFlowScore,
        savingsScore: averaged.savingsScore,
        expenseScore: averaged.expenseScore,
        debtScore,
        level,
        cashFlowRate: averaged.cashFlowRate,
        savingsRate: averaged.savingsRate,
        expensesExcessPct: averaged.expensesExcessPct,
        dti,
        avgMonthlyIncome,
        totalTransactions,
        totalIncome,
        totalExpenses,
        totalSavings,
      });

      const insight = this.buildInsight(
        totalScore,
        averaged.cashFlowScore,
        averaged.savingsScore,
        averaged.expenseScore,
        debtScore,
      );
      const weakestPillar = this.findWeakestPillarName(
        averaged.cashFlowScore,
        averaged.savingsScore,
        averaged.expenseScore,
        debtScore,
      );

      return {
        score: {
          total: totalScore,
          label: this.resolveLevelLabel(level),
          pillars: {
            cashFlow: {
              score: averaged.cashFlowScore,
              max: 25,
              rate: averaged.cashFlowRate,
              label: this.cashFlowLabel(averaged.cashFlowScore),
            },
            savings: {
              score: averaged.savingsScore,
              max: 25,
              rate: averaged.savingsRate,
              label: this.savingsLabel(averaged.savingsScore),
            },
            expenses: {
              score: averaged.expenseScore,
              max: 25,
              excessPct: averaged.expensesExcessPct,
              label: this.expensesLabel(averaged.expenseScore),
            },
            debt: {
              score: debtScore,
              max: 25,
              dti,
              label: this.debtLabel(debtScore),
            },
          },
          insight,
          weakestPillar,
        },
        debtRatio: this.buildDebtRatio(dti, totalDebt, avgMonthlyIncome * 12),
        totalTransactions,
        totals: { income: totalIncome, expenses: totalExpenses, savings: totalSavings },
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        this.context,
        `Error al calcular score financiero para ${userId}: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  private async calculatePillarsForBudget(budget: Budget): Promise<PillarResult> {
    const budgetId = budget.id as string;
    this.logger.info(this.context, `[pillares] gastos planeados — budgetId=${budgetId}`);
    const plannedExpenses = await this.plannedExpenseRepository.findByBudget(budgetId);

    this.logger.info(this.context, `[pillares] ahorros planeados — budgetId=${budgetId}`);
    const plannedSavings = await this.plannedSavingRepository.findByBudget(budgetId);

    this.logger.info(this.context, `[pillares] transacciones gastos — budgetId=${budgetId}`);
    const expenseTransactions = await this.transactionRepository.findByBudget(budgetId, {
      type: 'expense',
      limit: 1000,
      includeCategory: false,
    });

    this.logger.info(this.context, `[pillares] transacciones ingresos — budgetId=${budgetId}`);
    const incomeTransactions = await this.transactionRepository.findByBudget(budgetId, {
      type: 'income',
      limit: 1000,
      includeCategory: false,
    });

    this.logger.info(this.context, `[pillares] transacciones ahorros — budgetId=${budgetId}`);
    const savingsTransactions = await this.transactionRepository.findByBudget(budgetId, {
      type: 'savings',
      limit: 1000,
      includeCategory: false,
    });

    const totalIncome = incomeTransactions.data.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = expenseTransactions.data.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalSavings = savingsTransactions.data.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalTransactions =
      incomeTransactions.pagination.total +
      expenseTransactions.pagination.total +
      savingsTransactions.pagination.total;

    const plannedSavingsAmount = plannedSavings
      .filter((s) => s.status !== PlannedSavingStatus.SKIPPED)
      .reduce((sum, s) => sum + Number(s.amount ?? 0), 0);

    const plannedExpenseTotal = plannedExpenses
      .filter((e) => e.status !== PlannedExpenseStatus.CANCELED)
      .reduce((sum, e) => sum + Number(e.expectedAmount), 0);

    this.logger.info(
      this.context,
      `Presupuesto ${budget.id}: ingresos=${totalIncome} gastos=${totalExpenses} ahorros=${totalSavings} | gastosPlaneados=${plannedExpenseTotal} ahorrosPlaneados=${plannedSavingsAmount}`,
    );

    const { score: cashFlowScore, rate: cashFlowRate } = this.calcCashFlow(
      totalIncome,
      totalExpenses,
    );
    const { score: savingsScore, rate: savingsRate } = this.calcSavings(
      totalSavings,
      plannedSavingsAmount,
    );
    const { score: expenseScore, excessPct: expensesExcessPct } = this.calcExpenses(
      totalExpenses,
      plannedExpenseTotal,
    );

    this.logger.info(
      this.context,
      `Presupuesto ${budget.id} scores: cashFlow=${cashFlowScore}(rate=${cashFlowRate}%) savings=${savingsScore}(rate=${savingsRate}%) expenses=${expenseScore}(excess=${expensesExcessPct}%)`,
    );

    return {
      cashFlowScore,
      cashFlowRate,
      savingsScore,
      savingsRate,
      expenseScore,
      expensesExcessPct,
      totalTransactions,
      avgMonthlyIncome: totalIncome,
      totalIncome,
      totalExpenses,
      totalSavings,
    };
  }

  private calcCashFlow(
    totalIncome: number,
    totalExpenses: number,
  ): { score: number; rate: number } {
    if (totalIncome === 0) return { score: 0, rate: 0 };

    const netFlow = totalIncome - totalExpenses;
    const rate = (netFlow / totalIncome) * 100;

    let score: number;
    if (rate >= 30) score = 25;
    else if (rate >= 15) score = 20;
    else if (rate >= 5) score = 12;
    else if (rate >= 1) score = 5;
    else score = 0;

    return { score, rate: Math.round(rate * 100) / 100 };
  }

  private calcSavings(
    actualSavings: number,
    plannedSavings: number,
  ): { score: number; rate: number } {
    if (plannedSavings <= 0) return { score: 0, rate: 0 };

    const rate = (actualSavings / plannedSavings) * 100;

    let score: number;
    if (rate >= 100) score = 25;
    else if (rate >= 80) score = 20;
    else if (rate >= 50) score = 12;
    else if (rate >= 20) score = 5;
    else score = 0;

    return { score, rate: Math.round(rate * 100) / 100 };
  }

  private calcExpenses(
    actualExpenses: number,
    plannedExpenses: number,
  ): { score: number; excessPct: number } {
    if (plannedExpenses === 0 && actualExpenses === 0) return { score: 25, excessPct: 0 };
    if (plannedExpenses === 0 && actualExpenses > 0) return { score: 0, excessPct: 100 };

    const excess = Math.max(0, actualExpenses - plannedExpenses);
    const excessPct = (excess / plannedExpenses) * 100;

    let score: number;
    if (excessPct === 0) score = 25;
    else if (excessPct <= 10) score = 15;
    else if (excessPct <= 25) score = 8;
    else score = 0;

    return { score, excessPct: Math.round(excessPct * 100) / 100 };
  }

  private calcDti(totalDebt: number, avgMonthlyIncome: number): number {
    if (totalDebt === 0) return 0;
    if (avgMonthlyIncome === 0) return 200;

    const annualIncome = avgMonthlyIncome * 12;
    return Math.round((totalDebt / annualIncome) * 10000) / 100;
  }

  private calcDebtScore(totalDebt: number, avgMonthlyIncome: number): number {
    if (totalDebt === 0) return 25;

    const dti = this.calcDti(totalDebt, avgMonthlyIncome);

    if (dti < 20) return 25;
    if (dti < 36) return 20;
    if (dti < 50) return 12;
    if (dti <= 75) return 5;
    return 0;
  }

  private averagePillars(pillars: PillarResult[]): PillarResult {
    const count = pillars.length;
    const sum = pillars.reduce(
      (acc, p) => ({
        cashFlowScore: acc.cashFlowScore + p.cashFlowScore,
        cashFlowRate: acc.cashFlowRate + p.cashFlowRate,
        savingsScore: acc.savingsScore + p.savingsScore,
        savingsRate: acc.savingsRate + p.savingsRate,
        expenseScore: acc.expenseScore + p.expenseScore,
        expensesExcessPct: acc.expensesExcessPct + p.expensesExcessPct,
        totalTransactions: acc.totalTransactions + p.totalTransactions,
        avgMonthlyIncome: acc.avgMonthlyIncome + p.avgMonthlyIncome,
        totalIncome: acc.totalIncome + p.totalIncome,
        totalExpenses: acc.totalExpenses + p.totalExpenses,
        totalSavings: acc.totalSavings + p.totalSavings,
      }),
      {
        cashFlowScore: 0,
        cashFlowRate: 0,
        savingsScore: 0,
        savingsRate: 0,
        expenseScore: 0,
        expensesExcessPct: 0,
        totalTransactions: 0,
        avgMonthlyIncome: 0,
        totalIncome: 0,
        totalExpenses: 0,
        totalSavings: 0,
      },
    );

    return {
      cashFlowScore: Math.round(sum.cashFlowScore / count),
      cashFlowRate: Math.round((sum.cashFlowRate / count) * 100) / 100,
      savingsScore: Math.round(sum.savingsScore / count),
      savingsRate: Math.round((sum.savingsRate / count) * 100) / 100,
      expenseScore: Math.round(sum.expenseScore / count),
      expensesExcessPct: Math.round((sum.expensesExcessPct / count) * 100) / 100,
      totalTransactions: sum.totalTransactions,
      avgMonthlyIncome: Math.round(sum.avgMonthlyIncome / count),
      totalIncome: sum.totalIncome,
      totalExpenses: sum.totalExpenses,
      totalSavings: sum.totalSavings,
    };
  }

  private resolveLevel(score: number): HealthLevel {
    if (score <= 19) return 'critical';
    if (score <= 39) return 'precarious';
    if (score <= 59) return 'at_risk';
    if (score <= 74) return 'regular';
    if (score <= 89) return 'healthy';
    return 'optimal';
  }

  private resolveLevelLabel(level: HealthLevel): string {
    const labels: Record<HealthLevel, string> = {
      critical: 'Crítico',
      precarious: 'Precario',
      at_risk: 'En riesgo',
      regular: 'Regular',
      healthy: 'Saludable',
      optimal: 'Óptimo',
    };
    return labels[level];
  }

  private cashFlowLabel(score: number): string {
    if (score >= 25) return 'Óptimo';
    if (score >= 20) return 'Saludable';
    if (score >= 12) return 'Ajustado';
    if (score >= 5) return 'Muy ajustado';
    return 'Negativo';
  }

  private savingsLabel(score: number): string {
    if (score >= 25) return 'Meta cumplida';
    if (score >= 20) return 'Casi en meta';
    if (score >= 12) return 'A mitad';
    if (score >= 5) return 'Insuficiente';
    return 'Sin ahorro';
  }

  private expensesLabel(score: number): string {
    if (score >= 25) return 'Dentro del plan';
    if (score >= 15) return 'Ligeramente sobre';
    if (score >= 8) return 'Sobre el plan';
    return 'Muy sobre el plan';
  }

  private debtLabel(score: number): string {
    if (score >= 25) return 'Sin deuda';
    if (score >= 20) return 'Manejable';
    if (score >= 12) return 'Moderada';
    if (score >= 5) return 'Alta';
    return 'Crítica';
  }

  private findWeakestPillarName(
    cashFlowScore: number,
    savingsScore: number,
    expenseScore: number,
    debtScore: number,
  ): string {
    const pillars = [
      { name: 'Flujo de Caja', score: cashFlowScore },
      { name: 'Ahorro', score: savingsScore },
      { name: 'Gastos', score: expenseScore },
      { name: 'Deudas', score: debtScore },
    ];
    pillars.sort((a, b) => a.score - b.score);
    return pillars[0].name;
  }

  private buildInsight(
    totalScore: number,
    cashFlowScore: number,
    savingsScore: number,
    expenseScore: number,
    debtScore: number,
  ): string {
    if (totalScore === 0) return '';

    const weakest = this.findWeakestPillarName(
      cashFlowScore,
      savingsScore,
      expenseScore,
      debtScore,
    );

    if (totalScore >= 75) return `${weakest} es tu mayor área de mejora.`;
    if (totalScore >= 40) return `Enfoca tu atención en ${weakest}.`;
    return `Tu situación requiere atención. Empieza por ${weakest}.`;
  }

  private buildDebtRatio(
    dti: number,
    totalDebt: number,
    annualIncomeEstimate: number,
  ): HealthScoreFullResponse['debtRatio'] {
    if (totalDebt === 0) {
      return {
        ratio: 0,
        label: 'Sin deudas',
        badge: 'success',
        totalDebt: 0,
        annualIncomeEstimate,
      };
    }

    let label: string;
    let badge: string;

    if (dti < 20) {
      label = 'Excelente';
      badge = 'success';
    } else if (dti < 36) {
      label = 'Saludable';
      badge = 'primary';
    } else if (dti < 50) {
      label = 'Atención';
      badge = 'warning';
    } else if (dti <= 75) {
      label = 'Alto riesgo';
      badge = 'danger';
    } else {
      label = 'Crítico';
      badge = 'danger';
    }

    return {
      ratio: Math.round(dti * 100) / 100,
      label,
      badge,
      totalDebt,
      annualIncomeEstimate,
    };
  }

  private selectLastThree(budgets: Budget[]): Budget[] {
    return [...budgets]
      .sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        const monthA = this.monthOrder[a.month.toLowerCase()] ?? 0;
        const monthB = this.monthOrder[b.month.toLowerCase()] ?? 0;
        return monthB - monthA;
      })
      .slice(0, 3);
  }
}
