import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { DataSource } from 'typeorm';

import { findUserMoneyStrategy } from '@/common/money/user-money.strategy';
import { LoggerProviderService } from '@/core/providers';

import { GroupMemberEntity } from '../../../groups/infrastructure/database/entities/group-member.entity';
import type { TravelExpenseRepository } from '../../domain/repositories/travel-expense.repository';
import type { TravelExpenseAssignmentRepository } from '../../domain/repositories/travel-expense-assignment.repository';
import type { TravelExpenseAssignment } from '../../domain/travel-expense-assignment';
import { TravelExpenseEntity } from '../../infrastructure/database/entities/travel-expense.entity';
import { TravelExpenseAssignmentEntity } from '../../infrastructure/database/entities/travel-expense-assignment.entity';
import type {
  CreateTravelExpenseDto,
  SettleAssignmentDto,
  UpdateTravelExpenseDto,
} from '../../infrastructure/dto/travel-expense.dto';

@Injectable()
export class TravelExpenseService {
  private readonly context = TravelExpenseService.name;

  constructor(
    @Inject('TravelExpenseRepository')
    private readonly expenseRepo: TravelExpenseRepository,
    @Inject('TravelExpenseAssignmentRepository')
    private readonly assignmentRepo: TravelExpenseAssignmentRepository,
    @InjectRepository(GroupMemberEntity)
    private readonly memberRepo: Repository<GroupMemberEntity>,
    private readonly dataSource: DataSource,
    private readonly logger: LoggerProviderService,
  ) {}

  async createExpense(userId: string, dto: CreateTravelExpenseDto) {
    this.logger.info(this.context, `Creando gasto de viaje para grupo ${dto.groupId}`);

    await this.assertMembership(dto.groupId, userId);

    if (dto.splitType === 'CUSTOM' || dto.splitType === 'PERCENTAGE') {
      if (!dto.assignments?.length) {
        throw new BadRequestException(
          'Las asignaciones son requeridas para splitType CUSTOM o PERCENTAGE',
        );
      }
    }
    if (dto.splitType === 'CUSTOM') {
      const missingAmount = dto.assignments?.some((a) => a.assignedAmount === undefined);
      if (missingAmount)
        throw new BadRequestException('Cada asignación CUSTOM debe tener assignedAmount');
    }
    if (dto.splitType === 'PERCENTAGE') {
      const missingPct = dto.assignments?.some((a) => a.percentage === undefined);
      if (missingPct)
        throw new BadRequestException('Cada asignación PERCENTAGE debe tener percentage');
      const total = dto.assignments!.reduce((s, a) => s + (a.percentage ?? 0), 0);
      if (Math.abs(total - 100) > 0.01) {
        throw new BadRequestException(`Los porcentajes deben sumar 100 (suma actual: ${total})`);
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const expenseEntity = manager.create(TravelExpenseEntity, {
        groupId: dto.groupId,
        paidBy: userId,
        description: dto.description,
        amount: dto.amount,
        expenseDate: new Date(dto.expenseDate),
        splitType: dto.splitType,
      });
      const savedExpense = await manager.save(expenseEntity);

      let assignments: Partial<TravelExpenseAssignment>[];

      if (dto.splitType === 'EQUAL') {
        const members = await this.memberRepo.find({
          where: { groupId: dto.groupId, isActive: true, nulledAt: IsNull() },
        });
        if (!members.length) throw new BadRequestException('El grupo no tiene miembros activos');
        const strategy = await findUserMoneyStrategy(this.dataSource, userId);
        const ordered = this.payerFirst(members, userId);
        const shares = strategy.allocate(
          Number(dto.amount),
          ordered.map(() => 1),
        );
        assignments = ordered.map((m, i) => ({
          expenseId: savedExpense.id,
          userId: m.userId ?? undefined,
          assignedAmount: shares[i],
          settled: false,
        }));
      } else if (dto.splitType === 'PERCENTAGE') {
        const strategy = await findUserMoneyStrategy(this.dataSource, userId);
        const ordered = this.payerFirst(dto.assignments!, userId);
        const shares = strategy.allocate(
          Number(dto.amount),
          ordered.map((a) => a.percentage!),
        );
        assignments = ordered.map((a, i) => ({
          expenseId: savedExpense.id,
          userId: a.userId,
          assignedAmount: shares[i],
          settled: false,
        }));
      } else {
        assignments = dto.assignments!.map((a) => ({
          expenseId: savedExpense.id,
          userId: a.userId,
          assignedAmount: a.assignedAmount!,
          settled: false,
        }));
      }

      const assignmentEntities = manager.create(TravelExpenseAssignmentEntity, assignments);
      const savedAssignments = await manager.save(assignmentEntities);

      return {
        ...savedExpense,
        amount: Number(savedExpense.amount),
        assignments: savedAssignments.map((a) => ({
          ...a,
          assignedAmount: Number(a.assignedAmount),
        })),
      };
    });
  }

  /** Orden fijo del reparto: primero quien paga y luego por id, para que los centavos sobrantes no cambien de dueño */
  private payerFirst<T extends { userId?: string | null }>(people: T[], payerId: string): T[] {
    const rank = (person: T) => (person.userId === payerId ? 0 : 1);
    return [...people].sort(
      (a, b) => rank(a) - rank(b) || (a.userId ?? '').localeCompare(b.userId ?? ''),
    );
  }

  async getByGroup(groupId: string, userId: string) {
    this.logger.info(this.context, `Listando gastos del grupo ${groupId}`);
    await this.assertMembership(groupId, userId);

    const expenses = await this.expenseRepo.findByGroup(groupId);
    const withAssignments = await Promise.all(
      expenses.map(async (e) => ({
        ...e,
        assignments: await this.assignmentRepo.findByExpense(e.id!),
      })),
    );
    return withAssignments;
  }

  async getById(id: string, userId: string) {
    this.logger.info(this.context, `Obteniendo gasto ${id}`);
    const expense = await this.expenseRepo.findById(id);
    if (!expense) throw new NotFoundException('Gasto no encontrado');

    await this.assertMembership(expense.groupId, userId);

    const assignments = await this.assignmentRepo.findByExpense(id);
    return { ...expense, assignments };
  }

  async updateExpense(id: string, userId: string, dto: UpdateTravelExpenseDto) {
    this.logger.info(this.context, `Actualizando gasto ${id}`);
    const expense = await this.expenseRepo.findById(id);
    if (!expense) throw new NotFoundException('Gasto no encontrado');
    if (expense.paidBy !== userId) throw new ForbiddenException('Solo el creador puede editar');

    const newAmount = dto.amount ?? expense.amount;
    await this.expenseRepo.update(id, {
      ...(dto.description && { description: dto.description }),
      ...(dto.amount && { amount: dto.amount }),
      ...(dto.expenseDate && { expenseDate: new Date(dto.expenseDate) }),
    });

    if (dto.amount && expense.splitType === 'EQUAL') {
      const members = await this.memberRepo.find({
        where: { groupId: expense.groupId, isActive: true, nulledAt: IsNull() },
      });
      const strategy = await findUserMoneyStrategy(this.dataSource, expense.paidBy);
      const ordered = this.payerFirst(members, expense.paidBy);
      const shares = strategy.allocate(
        Number(newAmount),
        ordered.map(() => 1),
      );
      await this.assignmentRepo.deleteByExpense(id);
      await this.assignmentRepo.saveMany(
        ordered.map((m, i) => ({
          expenseId: id,
          userId: m.userId ?? undefined,
          assignedAmount: shares[i],
          settled: false,
        })),
      );
    }

    return this.getById(id, userId);
  }

  async deleteExpense(id: string, userId: string) {
    this.logger.info(this.context, `Eliminando gasto ${id}`);
    const expense = await this.expenseRepo.findById(id);
    if (!expense) throw new NotFoundException('Gasto no encontrado');
    if (expense.paidBy !== userId) throw new ForbiddenException('Solo el creador puede eliminar');

    await this.expenseRepo.softDelete(id);
  }

  async settleAssignment(expenseId: string, requesterId: string, dto: SettleAssignmentDto) {
    this.logger.info(this.context, `Confirmando pago de ${dto.userId} en gasto ${expenseId}`);
    const expense = await this.expenseRepo.findById(expenseId);
    if (!expense) throw new NotFoundException('Gasto no encontrado');

    await this.assertMemberRole(expense.groupId, requesterId, ['OWNER', 'EDITOR']);

    const assignment = await this.assignmentRepo.findByExpenseAndUser(expenseId, dto.userId);
    if (!assignment) throw new NotFoundException('Asignación no encontrada');
    if (!assignment.id) throw new NotFoundException('Asignación no encontrada');

    await this.assignmentRepo.settle(assignment.id);
    return { ...assignment, settled: true };
  }

  private async assertMembership(groupId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { groupId, userId, isActive: true, nulledAt: IsNull() },
    });
    if (!member) throw new ForbiddenException('No eres miembro de este grupo');
  }

  private async assertMemberRole(groupId: string, userId: string, roles: string[]): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { groupId, userId, isActive: true, nulledAt: IsNull() },
    });
    if (!member || !roles.includes(member.role)) {
      throw new ForbiddenException('No tienes permisos suficientes en este grupo');
    }
  }
}
