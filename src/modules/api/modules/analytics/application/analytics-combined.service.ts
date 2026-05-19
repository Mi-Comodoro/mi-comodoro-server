import { Inject, Injectable } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { AccountsPayableService } from '../../accounts-payable/application/accounts-payable.service';
import { AccountsReceivableService } from '../../accounts-receivable/application/accounts-receivable.service';
import { BudgetRepository } from '../../budgets/domain/repositories/budget.repository';
import { PlannedExpenseRepository } from '../../expenses/domain/repositories/expense-planned.repository';
import { FinancesRepository } from '../../finances/domain/repositories/finances.repository';
import { PlannedIncomeRepository } from '../../incomes/domain/repositories/incomes-planned.repository';
import { PlannedSavingRepository } from '../../savings/domain/repositories/planned.repository';
import { CashFlowForecastDto } from './dto/cash-flow-forecast.dto';
import { DebtProjectionDto } from './dto/debt-projection.dto';
import { NetPositionDto } from './dto/net-position.dto';
import { SavingsTrendDto } from './dto/savings-trend.dto';

@Injectable()
export class AnalyticsCombinedService {
  private readonly context = AnalyticsCombinedService.name;

  constructor(
    private readonly logger: LoggerProviderService,
    private readonly apService: AccountsPayableService,
    private readonly arService: AccountsReceivableService,
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
  ) {}

  private getCurrentMonthName(): string {
    return new Date()
      .toLocaleString('es-ES', { month: 'long' })
      .replace(/^./, (str) => str.toUpperCase());
  }

  private async getActiveBudget(userId: string) {
    const finances = await this.financesRepository.findByUserId(userId);
    if (!finances?.id) return null;
    const now = new Date();
    return this.budgetRepository.findByFinancesIdAndMonth(
      finances.id,
      this.getCurrentMonthName(),
      now.getFullYear(),
    );
  }

  async getNetPosition(userId: string): Promise<NetPositionDto> {
    this.logger.info(this.context, `Calculando posición neta para usuario ${userId}`);

    const [apSummary, arSummary, activeBudget] = await Promise.all([
      this.apService.getSummary(userId),
      this.arService.getSummary(userId),
      this.getActiveBudget(userId),
    ]);

    let monthlyIncome = 0;
    let freeAmount = 0;

    if (activeBudget?.id) {
      const [incomes, expenses] = await Promise.all([
        this.plannedIncomeRepository.findByBudgetId(activeBudget.id),
        this.plannedExpenseRepository.findByBudget(activeBudget.id),
      ]);
      monthlyIncome = incomes.reduce((sum, i) => sum + Number(i.amount ?? 0), 0);
      const plannedExpenses = expenses.reduce((sum, e) => sum + Number(e.expectedAmount), 0);
      freeAmount = Math.max(0, monthlyIncome - plannedExpenses);
    }

    return {
      totalAssets: freeAmount,
      totalDebts: apSummary.totalDebt,
      totalReceivable: arSummary.totalReceivable,
      netPosition: freeAmount + arSummary.totalReceivable - apSummary.totalDebt,
      debtToIncomeRatio: apSummary.debtToIncomeRatio,
      summary: {
        accountsPayable: {
          total: apSummary.totalDebt,
          monthlyCommitment: apSummary.monthlyCommitments,
          overdueCount: apSummary.overdueCount,
        },
        accountsReceivable: {
          total: arSummary.totalReceivable,
          expectedThisMonth: arSummary.expectedThisMonth,
          overdueCount: arSummary.overdueCount,
        },
      },
    };
  }

  async getDebtProjection(userId: string): Promise<DebtProjectionDto> {
    this.logger.info(this.context, `Calculando proyección de deuda para usuario ${userId}`);

    const apAccounts = await this.apService.findAll(userId);

    const totalDebt = apAccounts.reduce((sum, a) => sum + Number(a.currentBalance), 0);
    const totalMinPayments = apAccounts.reduce(
      (sum, a) => sum + (Number(a.minimumPayment) || 0),
      0,
    );

    const projection = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const month = date.toLocaleString('es-CO', { month: 'short', year: '2-digit' });

      const projectedPayments = apAccounts.reduce((sum, acc) => {
        if (acc.status === 'active' && acc.minimumPayment) {
          return sum + Number(acc.minimumPayment) * i;
        }
        return sum;
      }, 0);

      return {
        month,
        projectedBalance: Math.max(0, totalDebt - projectedPayments),
        minimumPayments: totalMinPayments,
      };
    });

    return { projection, simplified: true };
  }

  async getSavingsTrend(userId: string): Promise<SavingsTrendDto> {
    this.logger.info(this.context, `Calculando tendencia de ahorro para usuario ${userId}`);
    const trend = await this.plannedSavingRepository.findCompletedLast6MonthsByUserId(userId);
    return { trend };
  }

  async getCashFlowForecast(userId: string): Promise<CashFlowForecastDto> {
    this.logger.info(this.context, `Calculando pronóstico de flujo de caja para usuario ${userId}`);

    const [apSummary, arSummary, activeBudget] = await Promise.all([
      this.apService.getSummary(userId),
      this.arService.getSummary(userId),
      this.getActiveBudget(userId),
    ]);

    let monthlyIncome = 0;
    let monthlyExpenses = 0;

    if (activeBudget?.id) {
      const [incomes, expenses] = await Promise.all([
        this.plannedIncomeRepository.findByBudgetId(activeBudget.id),
        this.plannedExpenseRepository.findByBudget(activeBudget.id),
      ]);
      monthlyIncome = incomes.reduce((sum, i) => sum + Number(i.amount ?? 0), 0);
      monthlyExpenses = expenses.reduce((sum, e) => sum + Number(e.expectedAmount), 0);
    }

    const monthlyDebtPayments = apSummary.monthlyCommitments;
    const monthlyReceivables = arSummary.expectedThisMonth;

    const months = Array.from({ length: 3 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const month = date.toLocaleString('es-CO', { month: 'short', year: '2-digit' });
      const projectedIncome = monthlyIncome + monthlyReceivables;
      const projectedExpenses = monthlyExpenses + monthlyDebtPayments;
      return {
        month,
        projectedIncome,
        projectedExpenses,
        projectedNet: projectedIncome - projectedExpenses,
      };
    });

    return {
      months,
      assumptions: {
        basedOnBudget: !!activeBudget,
        incomeConstant: true,
        expensesConstant: true,
      },
    };
  }
}
