import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import {
  AccountPayableSummary,
  AccountsPayableService,
} from '../../accounts-payable/application/accounts-payable.service';
import { Budget } from '../../budgets/domain/budget';
import { BudgetRepository } from '../../budgets/domain/repositories/budget.repository';
import { PlannedExpenseStatus } from '../../expenses/domain/expenses';
import { PlannedExpenseRepository } from '../../expenses/domain/repositories/expense-planned.repository';
import { FinancesRepository } from '../../finances/domain/repositories/finances.repository';
import { PlannedIncomeRepository } from '../../incomes/domain/repositories/incomes-planned.repository';
import { GoalsRepository } from '../../savings/domain/repositories/goals.repository';
import { PlannedSavingRepository } from '../../savings/domain/repositories/planned.repository';
import { PlannedSavingStatus } from '../../savings/domain/savings-planned';
import { TransactionRepository } from '../../transactions/domain/repositories/transaction.repository';
import { FinancialHealthScore, HealthLevel } from '../domain/financial-health-score';
import { FinancialHealthScoreRepository } from '../domain/repositories/financial-health-score.repository';

interface PillarScores {
  cashFlowScore: number;
  savingsScore: number;
  expenseScore: number;
  debtScore: number;
  totalTransactions: number;
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
    @Inject('PlannedIncomeRepository')
    private readonly plannedIncomeRepository: PlannedIncomeRepository,
    @Inject('PlannedExpenseRepository')
    private readonly plannedExpenseRepository: PlannedExpenseRepository,
    @Inject('PlannedSavingRepository')
    private readonly plannedSavingRepository: PlannedSavingRepository,
    @Inject('GoalsRepository')
    private readonly goalsRepository: GoalsRepository,
    @Inject('TransactionRepository')
    private readonly transactionRepository: TransactionRepository,
    private readonly apService: AccountsPayableService,
  ) {}

  async getOrCalculateScore(userId: string): Promise<FinancialHealthScore> {
    const cached = await this.scoreRepository.findTodayByUserId(userId);
    if (cached) {
      this.logger.info(this.context, `Score del día ya existente para usuario ${userId}`);
      return cached;
    }

    return this.calculateScore(userId);
  }

  private async calculateScore(userId: string): Promise<FinancialHealthScore> {
    this.logger.info(this.context, `Calculando score financiero para usuario ${userId}`);

    const finances = await this.financesRepository.findByUserId(userId);
    if (!finances?.id) {
      throw new NotFoundException('Finanzas no encontradas para el usuario');
    }

    const [allBudgets, apSummary] = await Promise.all([
      this.budgetRepository.findAllByFinancesId(finances.id),
      this.apService.getSummary(userId),
    ]);
    const budgets = this.selectLastThree(allBudgets);
    const debtScore = this.calcDebtScore(apSummary);

    if (budgets.length === 0) {
      this.logger.warn(
        this.context,
        `Usuario ${userId} no tiene presupuestos — retornando score base`,
      );
      const result = await this.persistScore(userId, {
        cashFlowScore: 0,
        savingsScore: 0,
        expenseScore: 0,
        debtScore,
        totalTransactions: 0,
      });
      result.totalTransactions = 0;
      return result;
    }

    const pillarsByMonth = await Promise.all(
      budgets.map((budget) => this.calculatePillarsForBudget(budget)),
    );

    const averaged = this.averagePillars(pillarsByMonth);
    averaged.debtScore = debtScore;

    const totalTransactions = pillarsByMonth.reduce((sum, p) => sum + p.totalTransactions, 0);

    const result = await this.persistScore(userId, averaged);
    result.totalTransactions = totalTransactions;
    return result;
  }

  private async calculatePillarsForBudget(budget: Budget): Promise<PillarScores> {
    const [
      plannedIncomes,
      plannedExpenses,
      plannedSavings,
      expenseTransactions,
      incomeTransactions,
      savingsTransactions,
    ] = await Promise.all([
      this.plannedIncomeRepository.findByBudgetId(budget.id as string),
      this.plannedExpenseRepository.findByBudget(budget.id as string),
      this.plannedSavingRepository.findByBudget(budget.id as string),
      this.transactionRepository.findByBudget(budget.id as string, {
        type: 'expense',
        limit: 1000,
      }),
      this.transactionRepository.findByBudget(budget.id as string, {
        type: 'income',
        limit: 1,
      }),
      this.transactionRepository.findByBudget(budget.id as string, {
        type: 'savings',
        limit: 1000,
      }),
    ]);

    const realExpenseTotal = expenseTransactions.data.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalTransactions =
      expenseTransactions.pagination.total + incomeTransactions.pagination.total;

    const realSavingsTotal = savingsTransactions.data.reduce((sum, t) => sum + Number(t.amount), 0);
    const plannedSavingsAmount = plannedSavings
      .filter((s) => s.status !== PlannedSavingStatus.SKIPPED)
      .reduce((sum, s) => sum + Number(s.amount ?? 0), 0);

    const plannedExpenseTotal = plannedExpenses
      .filter((e) => e.status !== PlannedExpenseStatus.CANCELED)
      .reduce((sum, e) => sum + Number(e.expectedAmount), 0);

    const cashFlowScore = this.calcCashFlow(plannedIncomes, plannedExpenses);
    const savingsScore = this.calcSavings(realSavingsTotal, plannedSavingsAmount);
    const expenseScore = this.calcExpenses(realExpenseTotal, plannedExpenseTotal);
    const debtScore = 10;

    return { cashFlowScore, savingsScore, expenseScore, debtScore, totalTransactions };
  }

  private calcCashFlow(
    incomes: Awaited<ReturnType<PlannedIncomeRepository['findByBudgetId']>>,
    expenses: Awaited<ReturnType<PlannedExpenseRepository['findByBudget']>>,
  ): number {
    const incomePlanned = incomes.reduce((sum, i) => sum + Number(i.amount ?? 0), 0);
    const incomeReceived = incomes
      .filter((i) => i.status === 'RECEIVED')
      .reduce((sum, i) => sum + Number(i.amount ?? 0), 0);

    const gastosReales = expenses
      .filter((e) => e.status === PlannedExpenseStatus.PAID)
      .reduce((sum, e) => sum + Number(e.expectedAmount), 0);

    const ingresoScore =
      incomePlanned > 0 ? Math.min(10, (incomeReceived / incomePlanned) * 10) : 0;

    const ratio = incomeReceived > 0 ? gastosReales / incomeReceived : 1;
    const ratioScore = ratio <= 0.8 ? 10 : Math.max(0, 10 - (ratio - 0.8) * 50);

    const freeAmount = incomeReceived - gastosReales;
    const bufferScore = freeAmount > 0 ? 5 : 0;

    return Math.round(ingresoScore + ratioScore + bufferScore);
  }

  private calcSavings(realSavingsTotal: number, plannedSavingsAmount: number): number {
    if (plannedSavingsAmount <= 0) return 0;
    const ratio = Math.min(1, realSavingsTotal / plannedSavingsAmount);
    return Math.round(ratio * 25);
  }

  private calcExpenses(realExpenseTotal: number, plannedExpenseTotal: number): number {
    if (plannedExpenseTotal <= 0 && realExpenseTotal === 0) return 0;
    if (plannedExpenseTotal <= 0) return 0;
    const execRate = realExpenseTotal / plannedExpenseTotal;
    if (execRate > 1) return 0;
    return Math.round((1 - execRate) * 25);
  }

  private calcDebtScore(apSummary: AccountPayableSummary): number {
    if (apSummary.totalDebt === 0 && apSummary.monthlyCommitments === 0) {
      return 25;
    }
    const rawScore = Math.max(0, (1 - apSummary.debtToIncomeRatio) * 25);
    const overduePenalty = apSummary.overdueCount > 0 ? apSummary.overdueCount * 3 : 0;
    return Math.max(0, Math.round(rawScore - overduePenalty));
  }

  private averagePillars(pillars: PillarScores[]): PillarScores {
    const count = pillars.length;
    const sum = pillars.reduce(
      (acc, p) => ({
        cashFlowScore: acc.cashFlowScore + p.cashFlowScore,
        savingsScore: acc.savingsScore + p.savingsScore,
        expenseScore: acc.expenseScore + p.expenseScore,
        debtScore: acc.debtScore + p.debtScore,
        totalTransactions: acc.totalTransactions + p.totalTransactions,
      }),
      { cashFlowScore: 0, savingsScore: 0, expenseScore: 0, debtScore: 0, totalTransactions: 0 },
    );

    return {
      cashFlowScore: Math.round(sum.cashFlowScore / count),
      savingsScore: Math.round(sum.savingsScore / count),
      expenseScore: Math.round(sum.expenseScore / count),
      debtScore: Math.round(sum.debtScore / count),
      totalTransactions: sum.totalTransactions,
    };
  }

  private async persistScore(userId: string, pillars: PillarScores): Promise<FinancialHealthScore> {
    const totalScore =
      pillars.cashFlowScore + pillars.savingsScore + pillars.expenseScore + pillars.debtScore;
    const level = this.resolveLevel(totalScore);

    this.logger.info(
      this.context,
      `Score calculado para usuario ${userId}: total=${totalScore} nivel=${level}`,
    );

    return this.scoreRepository.insert({
      userId,
      totalScore,
      cashFlowScore: pillars.cashFlowScore,
      savingsScore: pillars.savingsScore,
      expenseScore: pillars.expenseScore,
      debtScore: pillars.debtScore,
      level,
    });
  }

  private resolveLevel(score: number): HealthLevel {
    if (score <= 20) return 'critical';
    if (score <= 40) return 'at_risk';
    if (score <= 60) return 'regular';
    if (score <= 80) return 'healthy';
    return 'optimal';
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
