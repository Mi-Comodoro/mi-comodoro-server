import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';
import { PlannedSavingEntity } from '@/modules/api/modules/savings/infrastructure/database/entities/saving-planned.entity';
import { TransactionEntity } from '@/modules/api/modules/transactions/infrastructure/database/entities/transaction.entity';

import { AccountRepository } from '../../../accounts/domain/repositories/account.respository';
import { Budget } from '../../../budgets/domain/budget';
import { BudgetRepository } from '../../../budgets/domain/repositories/budget.repository';
import { CategoryRepository } from '../../../categories/domain/repositories/category.repository';
import { SavingAllocationRepository } from '../../../savings/domain/repositories/allocation.repository';
import { PlannedSavingRepository } from '../../../savings/domain/repositories/planned.repository';
import { PlannedSaving, PlannedSavingStatus } from '../../../savings/domain/savings-planned';
import { TransactionRepository } from '../../../transactions/domain/repositories/transaction.repository';
import { PlannedIncome } from '../../domain/income-planned';
import { PlannedIncomeRepository } from '../../domain/repositories/incomes-planned.repository';
import { PlannedIncomeEntity } from '../../infrstructure/database/entities/incomes-planned.entity';

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
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async getByBudgetId(budgetId: string, userId: string) {
    this.logger.info(this.context, `Getting planned income by budget: ${budgetId} `);
    await this.assertBudgetOwner(budgetId, userId);
    return await this.plannedIncomeRepository.findByBudgetId(budgetId);
  }

  async findAll(userId: string) {
    this.logger.info(this.context, `Getting planned income`);
    const plannedIncomes = await this.plannedIncomeRepository.findAllPlanedIncomes();
    const ownedPlannedIncomes = [];

    for (const plannedIncome of plannedIncomes) {
      if (!plannedIncome.budgetId) continue;
      const budget = await this.budgetRepository.findById(plannedIncome.budgetId);
      if (budget?.ownerId === userId) {
        ownedPlannedIncomes.push(plannedIncome);
      }
    }

    return ownedPlannedIncomes;
  }

  async createManual(
    data: { budgetId: string; amount: number; date: Date; source: string },
    userId: string,
  ) {
    this.logger.info(
      this.context,
      `Creating manual planned income for budget: ${data.budgetId}, source: ${data.source}`,
    );

    await this.assertBudgetOwner(data.budgetId, userId);

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

  async markAsReceive(id: string, userId: string) {
    this.logger.info(this.context, `Mark income as receive: ${id}`);
    const existingPlannedIncome = await this.plannedIncomeRepository.findById(id);
    if (!existingPlannedIncome?.budgetId) {
      throw new NotFoundException('Planned Income not Fond');
    }

    const budget = await this.assertBudgetOwner(existingPlannedIncome.budgetId, userId);

    let plannedSavings: PlannedSaving[];

    await this.dataSource.transaction(async (manager) => {
      await manager.update(PlannedIncomeEntity, { id }, { status: 'RECEIVED' });
      await this.createIncomeTransaction(existingPlannedIncome, budget, manager);
      plannedSavings = await this.generatePlannedSavings(existingPlannedIncome, budget, manager);
    });

    const plannedIncome = await this.plannedIncomeRepository.findById(id);

    return {
      plannedIncome,
      plannedSavings: plannedSavings!,
    };
  }

  private async generatePlannedSavings(
    plannedIncome: Partial<PlannedIncome & { source: string }>,
    budget: Budget,
    manager?: EntityManager,
  ): Promise<PlannedSaving[]> {
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

    const domainRows = allocations.map((item) => {
      if (!item.goal?.accountId) {
        throw new BadRequestException(`Goal ${item.goalId} has no account assigned`);
      }

      const amount = Number((totalSavings * (item.percentage / 100)).toFixed(2));

      return {
        plannedIncomeId: plannedIncome.id,
        savingGoalId: item.goalId,
        accountId: item.goal.accountId,
        budgetId: plannedIncome.budgetId as string,
        amount,
        status: PlannedSavingStatus.PENDING,
        date: plannedIncome.date as Date,
        isAutoGenerated: true,
      };
    });

    if (manager) {
      const entityRows = domainRows.map((s) => ({
        budget: { id: s.budgetId },
        plannedIncome: s.plannedIncomeId ? { id: s.plannedIncomeId } : undefined,
        savingGoal: s.savingGoalId ? { id: s.savingGoalId } : undefined,
        account: s.accountId ? { id: s.accountId } : undefined,
        amount: s.amount,
        status: s.status,
        date: s.date,
        isAutoGenerated: s.isAutoGenerated,
      }));

      const savedEntities = await manager.save(PlannedSavingEntity, entityRows);

      return savedEntities.map((entity, i) => ({
        id: entity.id,
        amount: Number(entity.amount),
        date: entity.date,
        status: entity.status,
        budgetId: domainRows[i].budgetId,
        accountId: domainRows[i].accountId,
        savingGoalId: domainRows[i].savingGoalId,
        plannedIncomeId: domainRows[i].plannedIncomeId,
        isAutoGenerated: entity.isAutoGenerated ?? true,
        completedAt: entity.completedAt,
      }));
    }

    return await this.plannedSavingRepository.saveMany(domainRows);
  }

  private async createIncomeTransaction(
    plannedIncome: Partial<PlannedIncome & { source: string }>,
    budget: Budget,
    manager?: EntityManager,
  ) {
    this.logger.info(this.context, 'Creating income transaction');

    const incomeCategory = await this.categoryRepository.findByType('income');
    if (!incomeCategory) {
      throw new NotFoundException('Income category not found');
    }

    const primaryAccount = await this.accountRepository.findPrimaryByUserId(
      budget.ownerId as string,
    );

    const data = {
      plannedIncomeId: plannedIncome.id,
      amount: plannedIncome.amount,
      source: plannedIncome.source ?? 'unknown',
      budgetId: plannedIncome.budgetId,
      userId: budget.ownerId,
      categoryId: incomeCategory.id,
      type: 'income' as const,
      transactionDate: plannedIncome.date ?? new Date(),
      toAccountId: primaryAccount?.id,
    };

    if (manager) {
      return manager.save(TransactionEntity, data);
    }

    return await this.transactionRepository.save(data);
  }

  async deletePlannedIncome(id: string, userId: string): Promise<void> {
    this.logger.info(this.context, `Deleting planned income ${id}`);
    const plannedIncome = await this.plannedIncomeRepository.findById(id);
    if (!plannedIncome?.budgetId) {
      throw new NotFoundException('Planned Income not found');
    }

    await this.assertBudgetOwner(plannedIncome.budgetId, userId);
    await this.plannedIncomeRepository.delete(id);
  }

  private async assertBudgetOwner(budgetId: string, userId: string): Promise<Budget> {
    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget || budget.ownerId !== userId) {
      throw new NotFoundException('Budget not found');
    }

    return budget;
  }
}
