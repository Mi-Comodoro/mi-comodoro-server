import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { AccountRepository } from '../../../accounts/domain/repositories/account.respository';
import { BudgetRepository } from '../../../budgets/domain/repositories/budget.repository';
import { CategoryRepository } from '../../../categories/domain/repositories/category.repository';
import { TransactionRepository } from '../../../transactions/domain/repositories/transaction.repository';
import { Transaction } from '../../../transactions/domain/transaction';
import { PlannedExpense } from '../../domain/expenses';
import { PlannedExpenseRepository } from '../../domain/repositories/expense-planned.repository';
import { CreateExpensePlanDto } from '../../infrastructure/dto/expense.dto';
import { GetPlannedExpensesQueryDto } from '../../infrastructure/dto/expense.query.dto';

@Injectable()
export class ExpenseService {
  private readonly context = ExpenseService.name;
  constructor(
    @Inject('PlannedExpenseRepository')
    private readonly expensePlannedRepository: PlannedExpenseRepository,
    @Inject('BudgetRepository') private readonly budgetRepository: BudgetRepository,
    @Inject('TransactionRepository')
    private readonly transactionRepository: TransactionRepository,
    @Inject('CategoryRepository')
    private readonly categoryRepository: CategoryRepository,
    @Inject('AccountRepository')
    private readonly accountRepository: AccountRepository,
    private readonly logger: LoggerProviderService,
  ) {}
  async addPlan(dto: CreateExpensePlanDto) {
    this.logger.info(this.context, '');
    const plannedExpense: PlannedExpense = {
      budgetId: dto.budgetId,
      categoryId: dto.categoryId,
      name: dto.name,
      expectedAmount: dto.expectedAmount,
      dueDate: new Date(dto.dueDate),
      status: dto.status,
      isEssential: dto.isEssential,
      notes: dto.notes,
      billsId: dto.billsId,
    };
    return await this.expensePlannedRepository.add(plannedExpense);
  }

  async findAll(filters: GetPlannedExpensesQueryDto) {
    this.logger.info(this.context, '');
    return await this.expensePlannedRepository.findAll(filters);
  }

  async createUnplannedExpense(data: {
    userId: string;
    amount: number;
    categoryId: string;
    description?: string;
    budgetId: string;
    date: Date;
  }): Promise<{ transaction: Transaction }> {
    this.logger.info(this.context, `Creating unplanned expense for budget: ${data.budgetId}`);

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

    if (data.amount < 0) {
      throw new BadRequestException('Amount must be greater than or equal to 0');
    }

    const category = await this.categoryRepository.findById(data.categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const description = data.description?.trim();

    const transaction = await this.transactionRepository.save({
      amount: data.amount,
      source: description || 'Gasto no planificado',
      description,
      type: 'expense',
      userId: data.userId,
      budgetId: data.budgetId,
      categoryId: data.categoryId,
      transactionDate: data.date,
    });

    return { transaction };
  }

  async completePlannedExpense(
    id: string,
    userId: string,
  ): Promise<{ plannedExpense: PlannedExpense; transaction: Transaction }> {
    this.logger.info(this.context, `Complete planned expense: ${id}`);

    const plannedExpense = await this.expensePlannedRepository.findById(id);

    if (!plannedExpense) {
      throw new NotFoundException('Planned expense not found');
    }

    if (plannedExpense.status === 'PAID') {
      throw new BadRequestException('Este gasto ya fue pagado');
    }

    if (plannedExpense.status === 'CANCELED') {
      throw new BadRequestException('Este gasto está cancelado');
    }

    if (plannedExpense.status === 'SKIPPED') {
      throw new BadRequestException('Este gasto fue omitido');
    }

    const budget = await this.budgetRepository.findById(plannedExpense.budgetId);

    if (!budget) throw new NotFoundException('Budget not found');
    if (budget.status !== 'ACTIVE') throw new BadRequestException('Budget is not active');

    const categoria = await this.categoryRepository.findById(plannedExpense.categoryId);
    if (!categoria) throw new NotFoundException('Category not found');

    const primaryAccount = await this.accountRepository.findPrimaryByUserId(userId);

    // Crear transaction con los campos reales del dominio
    const transaction = await this.transactionRepository.save({
      amount: plannedExpense.expectedAmount, // ← expectedAmount
      source: plannedExpense.name, // ← name como source
      type: 'expense',
      userId,
      budgetId: plannedExpense.budgetId,
      categoryId: plannedExpense.categoryId,
      plannedExpenseId: plannedExpense.id,
      transactionDate: new Date(),
      fromAccountId: primaryAccount?.id,
      // accountId: undefined ← opcional, se agrega en el refactor de cuentas
    });

    const updated = await this.expensePlannedRepository.complete(id);

    this.logger.info(this.context, `Planned expense completed: ${id}`);

    return { plannedExpense: updated, transaction };
  }

  async updatePlannedExpense(
    id: string,
    userId: string,
    updateData: Partial<PlannedExpense>,
  ): Promise<PlannedExpense> {
    this.logger.info(this.context, `Updating planned expense: ${id}`);

    const plannedExpense = await this.expensePlannedRepository.findById(id);

    if (!plannedExpense) {
      throw new NotFoundException('Planned expense not found');
    }

    // Verificar que el expense pertenece al usuario (a través del budget)
    const budget = await this.budgetRepository.findById(plannedExpense.budgetId);

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    if (budget.ownerId !== userId) {
      throw new NotFoundException('Planned expense not found');
    }

    // No permitir cambiar budgetId ni status
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { budgetId, status, ...allowedUpdates } = updateData;

    const updated = await this.expensePlannedRepository.update(id, allowedUpdates);

    if (!updated) {
      throw new NotFoundException('Planned expense not found after update');
    }

    this.logger.info(this.context, `Planned expense updated: ${id}`);

    return updated;
  }

  async cancelPlannedExpense(id: string, userId: string): Promise<PlannedExpense> {
    this.logger.info(this.context, `Canceling planned expense: ${id}`);

    const plannedExpense = await this.expensePlannedRepository.findById(id);

    if (!plannedExpense) {
      throw new NotFoundException('Planned expense not found');
    }

    // Verificar que el expense pertenece al usuario (a través del budget)
    const budget = await this.budgetRepository.findById(plannedExpense.budgetId);

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    if (budget.ownerId !== userId) {
      throw new NotFoundException('Planned expense not found');
    }

    if (plannedExpense.status === 'PAID') {
      throw new BadRequestException('No se puede cancelar un gasto ya pagado');
    }

    if (plannedExpense.status === 'CANCELED') {
      throw new BadRequestException('Este gasto ya está cancelado');
    }

    const updated = await this.expensePlannedRepository.cancel(id);

    this.logger.info(this.context, `Planned expense canceled: ${id}`);

    return updated;
  }
}
