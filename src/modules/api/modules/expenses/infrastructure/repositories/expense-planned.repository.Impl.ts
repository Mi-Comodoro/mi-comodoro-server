import { NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GetPlannedExpensesDto, PlannedExpense, PlannedExpenseStatus } from '../../domain/expenses';
import { PlannedExpenseRepository } from '../../domain/repositories/expense-planned.repository';
import { PlannedExpenseEntity } from '../database/expenses-planned.entity';
import { ExpenseMapper } from '../mapper/expense.mapper';

export class PlannedExpenseRepositoryImpl implements PlannedExpenseRepository {
  constructor(
    @InjectRepository(PlannedExpenseEntity)
    private readonly expensePlannedRepository: Repository<PlannedExpenseEntity>,
  ) {}
  async add(data: PlannedExpense): Promise<PlannedExpense> {
    const response = await this.expensePlannedRepository.save(ExpenseMapper.toEntity(data));
    return ExpenseMapper.toDomain(response);
  }

  async findByBudget(budgetId: string): Promise<PlannedExpense[]> {
    const result = await this.expensePlannedRepository.find({
      where: { budgetId },
      order: { dueDate: 'ASC' },
    });

    return result.map((item) => ExpenseMapper.toDomain(item));
  }

  async findAll(filters: GetPlannedExpensesDto): Promise<{
    data: PlannedExpense[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const {
      budgetId,
      search,
      status,
      bucket,
      categoryIds,
      fromDate,
      toDate,
      minAmount,
      maxAmount,
      isFromBill,
      page = 1,
      limit = 10,
    } = filters;

    const query = this.expensePlannedRepository
      .createQueryBuilder('expense')
      .leftJoin('expense.category', 'category')
      .leftJoin('expense.bill', 'bill')
      .select([
        'expense.id AS id',
        'expense.name AS name',
        'expense.expectedAmount AS "expectedAmount"',
        'expense.dueDate AS "dueDate"',
        'expense.status AS status',
        'expense.isEssential AS "isEssential"',
        'expense.billsId AS "billsId"',
        'category.name AS category',
        'category.bucket AS bucket',
        `
      CASE
        WHEN bill.id IS NOT NULL THEN true
        ELSE false
      END AS "isFromBill"
      `,
      ])
      .where('expense.budgetId = :budgetId', { budgetId });

    // 🔍 Search
    if (search) {
      query.andWhere(
        `(LOWER(expense.name) LIKE LOWER(:search)
        OR LOWER(category.name) LIKE LOWER(:search))`,
        { search: `%${search}%` },
      );
    }
    const normalizeArray = (value?: string | string[]) => {
      if (!value) return undefined;
      return Array.isArray(value) ? value : [value];
    };

    // 📌 Status
    const statusArray = normalizeArray(status);
    if (statusArray) {
      query.andWhere('expense.status IN (:...status)', {
        status: statusArray,
      });
    }

    // 🪣 Bucket
    const bucketArray = normalizeArray(bucket);
    if (bucketArray) {
      query.andWhere('category.bucket IN (:...bucket)', {
        bucket: bucketArray,
      });
    }

    // 🗂️ Categorías
    if (categoryIds?.length) {
      query.andWhere('category.id IN (:...categoryIds)', {
        categoryIds,
      });
    }

    // 📅 Fechas
    if (fromDate) {
      query.andWhere('expense.dueDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('expense.dueDate <= :toDate', { toDate });
    }

    // 💰 Montos
    if (minAmount) {
      query.andWhere('expense.expectedAmount >= :minAmount', {
        minAmount,
      });
    }

    if (maxAmount) {
      query.andWhere('expense.expectedAmount <= :maxAmount', {
        maxAmount,
      });
    }

    // 🔁 Bill
    if (isFromBill !== undefined) {
      if (isFromBill) {
        query.andWhere('bill.id IS NOT NULL');
      } else {
        query.andWhere('bill.id IS NULL');
      }
    }

    // 📊 Total ANTES de paginar
    const total = await query.getCount();

    // 📄 Paginación
    const skip = (page - 1) * limit;

    query.skip(skip).take(limit);

    // 📅 Orden
    query.orderBy('expense.dueDate', 'ASC');

    // 🚀 Ejecutar
    const data: PlannedExpense[] = await query.getRawMany();
    return {
      data: data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findById(id: string): Promise<PlannedExpense | null> {
    const entity = await this.expensePlannedRepository.findOne({
      where: { id },
    });
    if (!entity) return null;
    return ExpenseMapper.toDomain(entity);
  }

  async update(id: string, data: Partial<PlannedExpense>): Promise<PlannedExpense | null> {
    // Crear objeto de actualización solo con campos definidos
    const updateData: Partial<PlannedExpenseEntity> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.expectedAmount !== undefined) updateData.expectedAmount = data.expectedAmount;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.billsId !== undefined) updateData.billsId = data.billsId || undefined;
    if (data.groupId !== undefined) updateData.groupId = data.groupId;

    const result = await this.expensePlannedRepository.update(id, updateData);
    if (result.affected === 0) return null;

    return await this.findById(id);
  }

  async cancel(id: string): Promise<PlannedExpense> {
    await this.expensePlannedRepository.update(id, { status: PlannedExpenseStatus.CANCELED });

    const updated = await this.expensePlannedRepository.findOne({
      where: { id },
    });

    if (!updated) throw new NotFoundException('Planned expense not found after cancel');

    return ExpenseMapper.toDomain(updated);
  }

  async complete(id: string): Promise<PlannedExpense> {
    await this.expensePlannedRepository.update(id, { status: PlannedExpenseStatus.PAID });

    const updated = await this.expensePlannedRepository.findOne({
      where: { id },
    });

    if (!updated) throw new NotFoundException('Planned expense not found after update');

    return ExpenseMapper.toDomain(updated);
  }
}
