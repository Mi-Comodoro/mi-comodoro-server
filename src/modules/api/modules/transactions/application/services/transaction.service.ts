import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { AccountRepository } from '../../../accounts/domain/repositories/account.respository';
import { BudgetRepository } from '../../../budgets/domain/repositories/budget.repository';
import { CategoryRepository } from '../../../categories/domain/repositories/category.repository';
import { TransactionRepository } from '../../domain/repositories/transaction.repository';
import { Transaction, TransactionFilters } from '../../domain/transaction';
import { CreateManualTransactionDto } from '../../infrastructure/dto/create-manual-transaction.dto';
import { UpdateTransactionDto } from '../../infrastructure/dto/update-transaction.dto';

@Injectable()
export class TransactionService {
  private readonly context = TransactionService.name;
  constructor(
    @Inject('TransactionRepository')
    private readonly transactionRepository: TransactionRepository,
    @Inject('BudgetRepository')
    private readonly budgetRepository: BudgetRepository,
    @Inject('CategoryRepository')
    private readonly categoryRepository: CategoryRepository,
    @Inject('AccountRepository')
    private readonly accountRepository: AccountRepository,
    private readonly logger: LoggerProviderService,
  ) {}

  async findByBudget(
    budgetId: string,
    userId: string,
    query: {
      type?: string;
      categoryId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    data: Transaction[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget || budget.ownerId !== userId) {
      throw new NotFoundException('Budget not found');
    }

    const filters: TransactionFilters = {
      type: ['income', 'expense', 'savings'].includes(query?.type as string)
        ? (query?.type as TransactionFilters['type'])
        : undefined,
      categoryId: query?.categoryId || undefined,
      dateFrom: query?.dateFrom || undefined,
      dateTo: query?.dateTo || undefined,
      page: query?.page ? Number(query.page) : 1,
      limit: query?.limit ? Number(query.limit) : 20,
    };

    return await this.transactionRepository.findByBudget(budgetId, filters);
  }

  async createManual(dto: CreateManualTransactionDto, userId: string): Promise<Transaction> {
    this.logger.info(this.context, `Creating manual transaction for user: ${userId}`);

    // Validar que el budget existe y pertenece al usuario
    const budget = await this.budgetRepository.findById(dto.budgetId);
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    if (budget.ownerId !== userId) {
      throw new NotFoundException('Budget not found');
    }
    if (budget.status !== 'ACTIVE') {
      throw new BadRequestException('Budget is not active');
    }

    // Validar categoría solo para gastos
    if (dto.type === 'expense') {
      if (!dto.categoryId) {
        throw new BadRequestException('Category is required for expense transactions');
      }
      const category = await this.categoryRepository.findById(dto.categoryId);
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    if (dto.accountId) {
      const account = await this.accountRepository.findByIdAndUser(dto.accountId, userId);
      if (!account) throw new ForbiddenException('Account does not belong to user');
    }

    // Validar que el amount sea positivo
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // Crear la transacción
    const transaction = await this.transactionRepository.save({
      amount: dto.amount,
      source: dto.source,
      description: dto.description,
      type: dto.type,
      userId,
      budgetId: dto.budgetId,
      categoryId: dto.categoryId,
      accountId: dto.accountId,
      transactionDate: dto.transactionDate,
    });

    this.logger.info(this.context, `Manual transaction created: ${transaction.id}`);

    return transaction;
  }

  async updateTransaction(
    id: string,
    userId: string,
    updateData: UpdateTransactionDto,
  ): Promise<Transaction> {
    this.logger.info(this.context, `Updating transaction: ${id}`);

    const transaction = await this.transactionRepository.findById(id);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Verificar que la transacción pertenece al usuario (a través del budget)
    const budget = await this.budgetRepository.findById(transaction.budgetId);

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    if (budget.ownerId !== userId) {
      throw new NotFoundException('Transaction not found');
    }

    // Validar category si se proporciona
    if (updateData.categoryId) {
      const category = await this.categoryRepository.findById(updateData.categoryId);
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    // Validar amount si se proporciona
    if (updateData.amount !== undefined && updateData.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // No permitir cambiar type, budgetId, accountId
    const { ...allowedUpdates } = updateData;

    const updated = await this.transactionRepository.update(id, allowedUpdates);

    if (!updated) {
      throw new NotFoundException('Transaction not found after update');
    }

    this.logger.info(this.context, `Transaction updated: ${id}`);

    return updated;
  }

  async softDeleteTransaction(id: string, userId: string): Promise<void> {
    this.logger.info(this.context, `Soft deleting transaction: ${id}`);

    const transaction = await this.transactionRepository.findById(id);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Verificar que la transacción pertenece al usuario (a través del budget)
    const budget = await this.budgetRepository.findById(transaction.budgetId);

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    if (budget.ownerId !== userId) {
      throw new NotFoundException('Transaction not found');
    }

    const deleted = await this.transactionRepository.softDelete(id);

    if (!deleted) {
      throw new NotFoundException('Transaction not found');
    }

    this.logger.info(this.context, `Transaction soft deleted: ${id}`);
  }
}
