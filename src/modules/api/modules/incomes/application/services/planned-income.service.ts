import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { AccountRepository } from '../../../accounts/domain/repositories/account.respository';
import { Budget } from '../../../budgets/domain/budget';
import { BudgetRepository } from '../../../budgets/domain/repositories/budget.repository';
import { CategoryRepository } from '../../../categories/domain/repositories/category.repository';
import { SavingAllocationRepository } from '../../../savings/domain/repositories/allocation.repository';
import { PlannedSavingRepository } from '../../../savings/domain/repositories/planned.repository';
import { PlannedSavingStatus } from '../../../savings/domain/savings-planned';
import { TransactionRepository } from '../../../transactions/domain/repositories/transaction.repository';
import { PlannedIncome } from '../../domain/income-planned';
import { PlannedIncomeRepository } from '../../domain/repositories/incomes-planned.repository';

@Injectable()
export class PlannedIncomeService {
  private readonly context: string = PlannedIncomeService.name;
  constructor(
    private readonly logger: LoggerProviderService,
    @Inject('PlannedIncomeRepository')
    private readonly plannedIncomeRepository: PlannedIncomeRepository,
    @Inject('PlannedSavingRepository') private plannedSavingRepository: PlannedSavingRepository,
    @Inject('SavingAllocationRepository')
    private readonly allocationRepository: SavingAllocationRepository,
    @Inject('BudgetRepository') private readonly budgetRepository: BudgetRepository,
    @Inject('TransactionRepository')
    private readonly transactionRepository: TransactionRepository,
    @Inject('CategoryRepository')
    private readonly categoryRepository: CategoryRepository,
    @Inject('AccountRepository')
    private readonly accountRepository: AccountRepository,
  ) {}

  async getByBudgetId(budgetId: string) {
    this.logger.info(this.context, `Getting planned income by budget: ${budgetId} `);
    return await this.plannedIncomeRepository.findByBudgetId(budgetId);
  }

  async findAll() {
    this.logger.info(this.context, `Getting planned income`);
    return await this.plannedIncomeRepository.findAllPlanedIncomes();
  }

  async createManual(data: { budgetId: string; amount: number; date: Date; source: string }) {
    this.logger.info(
      this.context,
      `Creating manual planned income for budget: ${data.budgetId}, source: ${data.source}`,
    );

    const budget = await this.budgetRepository.findById(data.budgetId);
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    if (!data.source?.trim()) {
      throw new BadRequestException('Source is required');
    }

    if (!data.amount || data.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    return await this.plannedIncomeRepository.create({
      budgetId: data.budgetId,
      amount: data.amount,
      date: data.date,
      source: data.source.trim(),
      status: 'PENDING',
    });
  }

  async createUnplannedIncome(data: {
    userId: string;
    amount: number;
    source: string;
    budgetId: string;
    date: Date;
  }) {
    this.logger.info(
      this.context,
      `Creating unplanned income for budget: ${data.budgetId}, source: ${data.source}`,
    );

    const budget = await this.budgetRepository.findById(data.budgetId);
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    if (budget.status !== 'ACTIVE') {
      throw new BadRequestException('Budget is not active');
    }

    if (budget.ownerId !== data.userId) {
      throw new NotFoundException('Budget not found');
    }

    if (!data.source?.trim()) {
      throw new BadRequestException('Source is required');
    }

    if (!data.amount || data.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const unplannedIncome = {
      amount: data.amount,
      source: data.source.trim(),
      budgetId: data.budgetId,
      date: data.date,
    };

    const transaction = await this.createIncomeTransaction(unplannedIncome, budget);
    const plannedSavings = await this.generatePlannedSavings(unplannedIncome, budget);

    return {
      transaction,
      plannedSavings,
    };
  }

  async markAsReceive(id: string) {
    this.logger.info(this.context, `Mark income as receive: ${id} `);
    const plannedIncome = await this.plannedIncomeRepository.markAsReceive(id);
    if (!plannedIncome) {
      throw new NotFoundException('Planned Income not Fond');
    }
    const budgetId = plannedIncome.budgetId as string;
    const budget = await this.budgetRepository.findById(budgetId);

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    await this.createIncomeTransaction(plannedIncome, budget);
    const plannedSavings = await this.generatePlannedSavings(plannedIncome, budget);

    return {
      plannedIncome,
      plannedSavings,
    };
  }

  private async generatePlannedSavings(
    plannedIncome: Partial<PlannedIncome & { source: string }>,
    budget: Budget,
  ) {
    this.logger.info(this.context, 'Creating planned savings');

    if (!plannedIncome.amount || plannedIncome.amount <= 0) {
      throw new BadRequestException('Invalid income amount');
    }

    if (budget.status !== 'ACTIVE') {
      throw new BadRequestException('Budget is not active');
    }

    if (!budget.savingsLimit || budget.savingsLimit <= 0) {
      throw new BadRequestException('Savings percentage not defined');
    }

    const savingPercentage = budget.savingsLimit / 100;
    const totalSavings = plannedIncome.amount * savingPercentage;

    const allocations = await this.allocationRepository.find(budget.id as string);

    if (!allocations.length) {
      throw new BadRequestException('No saving allocations defined');
    }

    const totalPercentage = allocations.reduce((acc, item) => acc + Number(item.percentage), 0);

    if (totalPercentage !== 100) {
      throw new BadRequestException('Allocations must sum 100%');
    }

    const plannedSavings = allocations.map((item) => {
      if (!item.goal?.accountId) {
        throw new BadRequestException(`Goal ${item.goalId} has no account assigned`);
      }

      const amount = Number((totalSavings * (item.percentage / 100)).toFixed(2));

      return {
        plannedIncomeId: plannedIncome.id,
        savingGoalId: item.goalId,
        accountId: item.goal.accountId,
        budgetId: plannedIncome.budgetId,
        amount,
        status: PlannedSavingStatus.PENDING,
        date: plannedIncome.date,
        isAutoGenerated: true,
      };
    });

    return await this.plannedSavingRepository.saveMany(plannedSavings);
  }

  private async createIncomeTransaction(
    plannedIncome: Partial<PlannedIncome & { source: string }>,
    budget: Budget, // ya lo tenés cargado en generatePlannedSavings
  ) {
    this.logger.info(this.context, 'Creating income transaction');

    const incomeCategory = await this.categoryRepository.findByType('income');
    if (!incomeCategory) {
      throw new NotFoundException('Income category not found');
    }

    // Buscar la cuenta principal del usuario (donde llega el ingreso)
    const primaryAccount = await this.accountRepository.findPrimaryByUserId(
      budget.ownerId as string,
    );

    return await this.transactionRepository.save({
      plannedIncomeId: plannedIncome.id,
      amount: plannedIncome.amount,
      source: plannedIncome.source ?? 'unknown',
      budgetId: plannedIncome.budgetId,
      userId: budget.ownerId,
      categoryId: incomeCategory.id,
      type: 'income',
      transactionDate: plannedIncome.date ?? new Date(),
      toAccountId: primaryAccount?.id, // A donde llega el ingreso (cuenta principal)
      // fromAccountId no se usa porque el ingreso no viene de una cuenta interna
    });
  }
}
