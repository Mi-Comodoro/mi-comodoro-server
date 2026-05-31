import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import { BudgetRepository } from '../../../budgets/domain/repositories/budget.repository';
import { PlannedExpenseStatus } from '../../../expenses/domain/expenses';
import { PlannedExpenseEntity } from '../../../expenses/infrastructure/database/expenses-planned.entity';
import { Bill } from '../../domain/bills';
import { BillsRepository } from '../../domain/repositories/bills.repository';
import { CreateBillDto, ImportBillsDto, UpdateBillDto } from '../../infrastructure/dto/bill.dto';

const MONTH_MAP: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

@Injectable()
export class BillsService {
  private readonly context = BillsService.name;

  constructor(
    @Inject('BillsRepository') private readonly billsRepository: BillsRepository,
    @Inject('BudgetRepository') private readonly budgetRepository: BudgetRepository,
    @InjectRepository(PlannedExpenseEntity)
    private readonly plannedExpenseRepo: Repository<PlannedExpenseEntity>,
    private readonly logger: LoggerProviderService,
  ) {}

  async findAll(userId: string): Promise<Bill[]> {
    this.logger.info(this.context, 'Listando todas las facturas del usuario');
    return this.billsRepository.findAllByUser(userId);
  }

  async findActive(userId: string): Promise<Bill[]> {
    this.logger.info(this.context, 'Listando facturas activas del usuario');
    return this.billsRepository.findActiveByUser(userId);
  }

  async create(dto: CreateBillDto, userId: string): Promise<Bill> {
    this.logger.info(this.context, `Creando factura recurrente: ${dto.name}`);
    return this.billsRepository.create({
      userId,
      categoryId: dto.categoryId,
      name: dto.name,
      expectedAmount: dto.expectedAmount,
      billingDay: dto.billingDay,
      frequency: dto.frequency,
      isActive: true,
      isPaid: false,
    });
  }

  async update(id: string, dto: UpdateBillDto, userId: string): Promise<Bill> {
    this.logger.info(this.context, `Actualizando factura ${id}`);
    const updated = await this.billsRepository.update(id, userId, dto);
    if (!updated) throw new NotFoundException('Factura no encontrada');
    return updated;
  }

  async toggleActive(id: string, userId: string): Promise<Bill> {
    this.logger.info(this.context, `Cambiando estado activo de factura ${id}`);
    const updated = await this.billsRepository.toggleActive(id, userId);
    if (!updated) throw new NotFoundException('Factura no encontrada');
    return updated;
  }

  async delete(id: string, userId: string): Promise<void> {
    this.logger.info(this.context, `Eliminando factura ${id}`);
    await this.billsRepository.delete(id, userId);
  }

  async importToBudget(dto: ImportBillsDto, budgetId: string, userId: string): Promise<number> {
    this.logger.info(
      this.context,
      `Importando ${dto.billIds.length} facturas al presupuesto ${budgetId}`,
    );

    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget || budget.ownerId !== userId) {
      throw new NotFoundException('Presupuesto no encontrado');
    }

    const bills = await this.billsRepository.findManyByIds(dto.billIds, userId);
    if (!bills.length) {
      throw new NotFoundException('No se encontraron facturas para importar');
    }

    const monthIndex = MONTH_MAP[budget.month.toLowerCase()] ?? 0;

    const expenses = bills.map((bill) => {
      const expense = new PlannedExpenseEntity();
      expense.budgetId = budgetId;
      expense.categoryId = bill.categoryId;
      expense.name = bill.name;
      expense.expectedAmount = bill.expectedAmount;
      expense.dueDate = new Date(budget.year, monthIndex, bill.billingDay);
      expense.status = PlannedExpenseStatus.PLANNED;
      expense.isEssential = true;
      expense.billsId = bill.id!;
      return expense;
    });

    await this.plannedExpenseRepo.save(expenses);
    this.logger.info(this.context, `${expenses.length} gastos planificados creados desde facturas`);
    return expenses.length;
  }
}
