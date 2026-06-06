import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';
import { AccountsPayableService } from '@/modules/api/modules/accounts-payable/application/accounts-payable.service';
import { AccountsReceivableService } from '@/modules/api/modules/accounts-receivable/application/accounts-receivable.service';
import { BudgetService } from '@/modules/api/modules/budgets/application/budget.service';
import { NotificationsService } from '@/modules/api/modules/notifications/application/services/notifications.service';
import { NotificationType } from '@/modules/api/modules/notifications/domain/enums/notification-type.enum';
import { TransactionEntity } from '@/modules/api/modules/transactions/infrastructure/database/entities/transaction.entity';

import type { GroupExpense } from '../domain/group-expense';
import type { GroupMember } from '../domain/group-member';
import type { GroupContributionRepository } from '../domain/repositories/group-contribution.repository';
import type { GroupExpenseRepository } from '../domain/repositories/group-expense.repository';
import type { GroupMemberRepository } from '../domain/repositories/group-member.repository';
import type { UserGroupRepository } from '../domain/repositories/user-group.repository';
import type { UserGroup } from '../domain/user-group';
import type {
  CreateGroupExpenseDto,
  UpdateGroupExpenseDto,
} from '../infrastructure/dto/group-expense.dto';
import type {
  AddMemberDto,
  CreateGroupDto,
  InviteWithContextDto,
  RespondGroupInvitationDto,
  UpdateGroupDto,
} from '../infrastructure/dto/groups.dto';

export interface ContributionSummary {
  goal: number | null;
  totalContributed: number;
  members: {
    userId: string | null;
    handle: string | null;
    externalName: string | null;
    role: string;
    memberStatus: string;
    totalAmount: number;
    percentage: number;
    budgetLabel: string | null;
  }[];
}

@Injectable()
export class GroupsService {
  private readonly context: string = GroupsService.name;

  constructor(
    @Inject('UserGroupRepository') private readonly groupRepository: UserGroupRepository,
    @Inject('GroupMemberRepository') private readonly memberRepository: GroupMemberRepository,
    @Inject('GroupExpenseRepository') private readonly expenseRepository: GroupExpenseRepository,
    @Inject('GroupContributionRepository')
    private readonly contributionRepository: GroupContributionRepository,
    private readonly logger: LoggerProviderService,
    private readonly dataSource: DataSource,
    private readonly accountsReceivableService: AccountsReceivableService,
    private readonly accountsPayableService: AccountsPayableService,
    private readonly budgetService: BudgetService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createGroup(
    userId: string,
    dto: CreateGroupDto,
  ): Promise<UserGroup & { members: GroupMember[] }> {
    this.logger.info(this.context, `Creating group for user ${userId}`);
    const group = await this.groupRepository.save({
      name: dto.name,
      type: dto.type,
      ownerId: userId,
      maxMembers: dto.maxMembers ?? 5,
      status: 'Activo',
    });
    const member = await this.memberRepository.save({
      groupId: group.id,
      userId,
      role: 'ORGANIZER',
      memberStatus: 'active',
      isActive: true,
    });
    return { ...group, members: [member] };
  }

  async getGroups(userId: string): Promise<UserGroup[]> {
    this.logger.info(this.context, `Getting groups for user ${userId}`);
    const owned = await this.groupRepository.findByOwner(userId);
    const memberships = await this.memberRepository.findByUser(userId);
    const memberGroupIds = new Set(memberships.map((m) => m.groupId));
    const memberGroups = await Promise.all(
      [...memberGroupIds]
        .filter((id) => !owned.some((g) => g.id === id))
        .map((id) => this.groupRepository.findById(id)),
    );
    return [...owned, ...memberGroups.filter((g): g is UserGroup => g !== null)];
  }

  async getGroupById(id: string, userId: string): Promise<UserGroup & { members: GroupMember[] }> {
    this.logger.info(this.context, `Getting group ${id}`);
    const group = await this.groupRepository.findById(id);
    if (!group) throw new NotFoundException('Grupo no encontrado');
    await this.assertMembership(id, userId);
    const members = await this.memberRepository.findByGroup(id);

    const userIds = members.filter((m) => m.userId).map((m) => m.userId as string);
    const profiles = await this.getMemberProfiles(userIds);

    const enriched = members.map((m) => ({
      ...m,
      handle: m.userId ? (profiles.get(m.userId)?.handle ?? null) : null,
      displayName: m.userId ? (profiles.get(m.userId)?.displayName ?? null) : null,
    }));

    return { ...group, members: enriched };
  }

  async updateGroup(id: string, userId: string, dto: UpdateGroupDto): Promise<UserGroup> {
    this.logger.info(this.context, `Updating group ${id}`);
    const group = await this.groupRepository.findById(id);
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.ownerId !== userId)
      throw new ForbiddenException('Solo el organizador puede editar el grupo');
    return this.groupRepository.save({ ...group, ...dto, id });
  }

  async deleteGroup(id: string, userId: string): Promise<void> {
    this.logger.info(this.context, `Deleting group ${id}`);
    const group = await this.groupRepository.findById(id);
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.ownerId !== userId)
      throw new ForbiddenException('Solo el organizador puede eliminar el grupo');
    await this.groupRepository.softDelete(id);
  }

  async addMember(groupId: string, requesterId: string, dto: AddMemberDto): Promise<GroupMember> {
    this.logger.info(this.context, `Adding member to group ${groupId}`);
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.ownerId !== requesterId)
      throw new ForbiddenException('Solo el organizador puede invitar miembros');
    const existing = await this.memberRepository.findOne(groupId, dto.userId);
    if (existing) throw new ConflictException('El usuario ya es miembro del grupo');
    return this.memberRepository.save({
      groupId,
      userId: dto.userId,
      role: dto.role ?? 'MEMBER',
      memberStatus: 'active',
      isActive: true,
    });
  }

  async removeMember(groupId: string, targetUserId: string, requesterId: string): Promise<void> {
    this.logger.info(this.context, `Removing member ${targetUserId} from group ${groupId}`);
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (requesterId !== targetUserId && group.ownerId !== requesterId) {
      throw new ForbiddenException('Solo el organizador o el propio usuario puede salir del grupo');
    }
    const member = await this.memberRepository.findOne(groupId, targetUserId);
    if (!member) throw new NotFoundException('Miembro no encontrado en el grupo');
    if (!member.id) throw new NotFoundException('Miembro no encontrado en el grupo');
    await this.memberRepository.softDelete(member.id);
  }

  async getContributions(groupId: string, requesterId: string): Promise<ContributionSummary> {
    this.logger.info(this.context, `Getting contributions for group ${groupId}`);
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundException('Grupo no encontrado');
    await this.assertMembership(groupId, requesterId);

    const members = await this.memberRepository.findByGroup(groupId);
    const contributions = await this.contributionRepository.findByGroup(groupId);
    const totalContributed = contributions.reduce((sum, c) => sum + Number(c.amount), 0);

    const userIds = members
      .filter((m) => m.userId && m.memberStatus === 'active')
      .map((m) => m.userId as string);

    const handles = await this.getUserHandles(userIds);

    const membersData = members.map((member) => {
      const memberContribs = contributions.filter((c) => c.userId === member.userId);
      const totalAmount = memberContribs.reduce((sum, c) => sum + Number(c.amount), 0);
      const latestContrib = memberContribs.at(-1);
      const percentage =
        totalContributed > 0 ? Math.round((totalAmount / totalContributed) * 100) : 0;

      return {
        userId: member.userId ?? null,
        handle: member.userId ? (handles.get(member.userId) ?? null) : null,
        externalName: member.externalName ?? null,
        role: member.role,
        memberStatus: member.memberStatus,
        totalAmount,
        percentage,
        budgetLabel: latestContrib?.budgetLabel ?? null,
      };
    });

    return {
      goal: group.goal ?? null,
      totalContributed,
      members: membersData,
    };
  }

  async getExpenses(groupId: string, requesterId: string): Promise<GroupExpense[]> {
    this.logger.info(this.context, `Getting expenses for group ${groupId}`);
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundException('Grupo no encontrado');
    await this.assertMembership(groupId, requesterId);
    return this.expenseRepository.findByGroup(groupId);
  }

  async createExpense(
    groupId: string,
    requesterId: string,
    dto: CreateGroupExpenseDto,
  ): Promise<GroupExpense> {
    this.logger.info(this.context, `Creating expense for group ${groupId}`);
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.status === 'Cerrado')
      throw new ForbiddenException('No se pueden agregar gastos a un grupo cerrado');
    await this.assertOrganizerRole(groupId, requesterId);
    return this.expenseRepository.save({
      groupId,
      description: dto.description,
      amount: dto.amount,
      dueDate: new Date(dto.dueDate),
      responsibleUserId: dto.responsibleUserId,
      status: 'planned',
    });
  }

  async updateExpense(
    groupId: string,
    expenseId: string,
    requesterId: string,
    dto: UpdateGroupExpenseDto,
  ): Promise<GroupExpense> {
    this.logger.info(this.context, `Updating expense ${expenseId} in group ${groupId}`);
    const expense = await this.expenseRepository.findById(expenseId);
    if (!expense || expense.groupId !== groupId) throw new NotFoundException('Gasto no encontrado');
    if (expense.status !== 'planned')
      throw new BadRequestException('Solo se pueden editar gastos en estado planificado');
    await this.assertOrganizerRole(groupId, requesterId);
    return this.expenseRepository.update(expenseId, {
      ...(dto.description && { description: dto.description }),
      ...(dto.amount !== undefined && { amount: dto.amount }),
      ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
      ...(dto.responsibleUserId && { responsibleUserId: dto.responsibleUserId }),
    });
  }

  async payExpense(groupId: string, expenseId: string, requesterId: string): Promise<GroupExpense> {
    this.logger.info(this.context, `Paying expense ${expenseId} in group ${groupId}`);
    const expense = await this.expenseRepository.findById(expenseId);
    if (!expense || expense.groupId !== groupId) throw new NotFoundException('Gasto no encontrado');
    await this.assertCanActOnExpense(groupId, expenseId, requesterId);

    if (expense.cxcId) {
      try {
        await this.accountsReceivableService.registerCollection(expense.cxcId, requesterId, {
          amount: expense.amount,
          collectionDate: new Date().toISOString(),
          notes: `Pago recibido — grupo`,
        });
      } catch {
        this.logger.warn(this.context, `No se pudo registrar cobro en CxC ${expense.cxcId}`);
      }
    }

    if (expense.cxpId) {
      try {
        await this.accountsPayableService.registerPayment(
          expense.cxpId,
          expense.responsibleUserId,
          {
            amount: expense.amount,
            paymentDate: new Date().toISOString(),
            notes: `Pago de gasto de grupo`,
          },
        );
      } catch {
        this.logger.warn(this.context, `No se pudo registrar pago en CxP ${expense.cxpId}`);
      }
    }

    const [payerBudget, organizerBudget] = await Promise.all([
      this.budgetService.getDefaultBudget(expense.responsibleUserId),
      this.budgetService.getDefaultBudget(requesterId),
    ]);

    const transactionDate = new Date();

    if (payerBudget?.id) {
      try {
        await this.dataSource.manager.save(TransactionEntity, {
          type: 'expense' as const,
          amount: expense.amount,
          source: expense.description,
          description: `Pago de gasto de grupo`,
          userId: expense.responsibleUserId,
          budgetId: payerBudget.id,
          transactionDate,
        });
      } catch {
        this.logger.warn(this.context, `No se pudo registrar gasto en presupuesto del responsable`);
      }
    }

    if (organizerBudget?.id && requesterId !== expense.responsibleUserId) {
      try {
        await this.dataSource.manager.save(TransactionEntity, {
          type: 'income' as const,
          amount: expense.amount,
          source: expense.description,
          description: `Cobro de gasto de grupo`,
          userId: requesterId,
          budgetId: organizerBudget.id,
          transactionDate,
        });
      } catch {
        this.logger.warn(
          this.context,
          `No se pudo registrar ingreso en presupuesto del organizador`,
        );
      }
    }

    return this.expenseRepository.updateStatus(expenseId, 'paid');
  }

  async markExpenseCxp(
    groupId: string,
    expenseId: string,
    requesterId: string,
  ): Promise<GroupExpense> {
    this.logger.info(this.context, `Marking expense ${expenseId} as CxP`);
    const expense = await this.expenseRepository.findById(expenseId);
    if (!expense || expense.groupId !== groupId) throw new NotFoundException('Gasto no encontrado');
    await this.assertCanActOnExpense(groupId, expenseId, requesterId);

    const profiles = await this.getMemberProfiles([expense.responsibleUserId]);
    const responsible = profiles.get(expense.responsibleUserId);
    const responsibleLabel = responsible?.handle
      ? `@${responsible.handle}`
      : (responsible?.displayName ?? expense.responsibleUserId.slice(0, 8));

    const dueDateIso =
      expense.dueDate instanceof Date ? expense.dueDate.toISOString() : String(expense.dueDate);

    const [cxc, cxp] = await Promise.all([
      this.accountsReceivableService.create(requesterId, {
        name: expense.description,
        description: `Gasto de grupo pendiente de cobro`,
        debtor: responsibleLabel,
        originalAmount: expense.amount,
        dueDate: dueDateIso,
      }),
      this.accountsPayableService.create(expense.responsibleUserId, {
        name: expense.description,
        description: `Deuda de gasto de grupo`,
        type: 'other',
        originalAmount: expense.amount,
        dueDate: dueDateIso,
      }),
    ]);

    await Promise.all([
      this.accountsReceivableService.setLinkedCxp(cxc.id!, cxp.id!),
      this.accountsPayableService.setLinkedCxc(cxp.id!, cxc.id!),
    ]);

    return this.expenseRepository.updateStatus(expenseId, 'cxp', {
      cxcId: cxc.id,
      cxpId: cxp.id,
    });
  }

  async getGroupBudgetProgress(
    groupId: string,
    userId: string,
  ): Promise<{
    goal: number | null;
    totalLinked: number;
    totalPaid: number;
    expenses: {
      id: string;
      name: string;
      expectedAmount: number;
      status: string;
      budgetId: string;
      userId: string | null;
    }[];
  }> {
    this.logger.info(this.context, `Getting budget progress for group ${groupId}`);
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundException('Grupo no encontrado');
    await this.assertMembership(groupId, userId);

    const rows = await this.dataSource.query<
      {
        id: string;
        name: string;
        expected_amount: string;
        status: string;
        budget_id: string;
        user_id: string | null;
      }[]
    >(
      `SELECT ep.id, ep.name, ep.expected_amount, ep.status, ep.budget_id, b.owner_id AS user_id
       FROM expenses_planned ep
       LEFT JOIN budgets b ON b.id = ep.budget_id
       WHERE ep.group_id = $1`,
      [groupId],
    );

    const expenses = rows.map((r) => ({
      id: r.id,
      name: r.name,
      expectedAmount: Number(r.expected_amount),
      status: r.status,
      budgetId: r.budget_id,
      userId: r.user_id ?? null,
    }));

    const totalLinked = expenses.reduce((sum, e) => sum + e.expectedAmount, 0);
    const totalPaid = expenses
      .filter((e) => e.status === 'PAID')
      .reduce((sum, e) => sum + e.expectedAmount, 0);

    return {
      goal: group.goal ?? null,
      totalLinked,
      totalPaid,
      expenses,
    };
  }

  async inviteWithContext(
    groupId: string,
    requesterId: string,
    dto: InviteWithContextDto,
  ): Promise<GroupMember> {
    this.logger.info(this.context, `Inviting user ${dto.userId} to group ${groupId} with context`);
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.ownerId !== requesterId)
      throw new ForbiddenException('Solo el organizador puede invitar miembros');

    const existing = await this.memberRepository.findOne(groupId, dto.userId);
    if (existing) throw new ConflictException('El usuario ya es miembro del grupo');

    const member = await this.memberRepository.save({
      groupId,
      userId: dto.userId,
      role: dto.role ?? 'MEMBER',
      memberStatus: 'invited',
      isActive: false,
    });

    const profiles = await this.getMemberProfiles([requesterId]);
    const inviter = profiles.get(requesterId);

    try {
      await this.notificationsService.createNotification(
        dto.userId,
        NotificationType.GROUP_TRIP_INVITATION,
        {
          senderId: requesterId,
          senderHandle: inviter?.handle ?? undefined,
          senderDisplayName: inviter?.displayName ?? undefined,
          inviterHandle: inviter?.handle ?? undefined,
          groupId,
          groupName: group.name,
          goal: group.goal ?? null,
          organizerPlannedAmount: dto.plannedAmount,
        },
      );
    } catch {
      this.logger.warn(
        this.context,
        `No se pudo enviar notificación de invitación a viaje a ${dto.userId}`,
      );
    }

    return member;
  }

  async respondToInvitation(
    groupId: string,
    responderId: string,
    dto: RespondGroupInvitationDto,
  ): Promise<{
    accepted: boolean;
    expense?: { id: string; name: string; expectedAmount: number };
  }> {
    this.logger.info(
      this.context,
      `User ${responderId} responds to invitation for group ${groupId}`,
    );
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundException('Grupo no encontrado');

    const member = await this.memberRepository.findOne(groupId, responderId);
    if (!member || (member.memberStatus !== 'invited' && member.memberStatus !== 'active'))
      throw new NotFoundException('Invitación pendiente no encontrada');
    if (!member.id) throw new NotFoundException('Invitación pendiente no encontrada');

    if (dto.action === 'decline') {
      await this.memberRepository.softDelete(member.id);
      return { accepted: false };
    }

    // Activate membership only if still pending (idempotent — first attempt may have activated already)
    if (member.memberStatus === 'invited') {
      await this.dataSource.query(
        `UPDATE group_members SET member_status = 'active', is_active = true WHERE id = $1`,
        [member.id],
      );
    }

    // Determine expense to create (skipped for accept_no_budget)
    let expense: { id: string; name: string; expectedAmount: number } | undefined;

    if (dto.action !== 'accept_no_budget') {
      const inviteNotification = await this.dataSource.query<
        { payload: Record<string, unknown> }[]
      >(
        `SELECT payload FROM notifications
         WHERE user_id = $1 AND type = 'group_trip_invitation'
           AND (payload->>'groupId') = $2
         ORDER BY created_at DESC LIMIT 1`,
        [responderId, groupId],
      );

      const organizerAmount = Number(inviteNotification[0]?.payload?.organizerPlannedAmount ?? 0);
      const amount =
        dto.action === 'accept_full' ? organizerAmount : Math.round(organizerAmount / 2);

      if (amount > 0) {
        // Resolve budget — accept ACTIVE or PLANNED (getDefaultBudget only finds ACTIVE+isDefault)
        let budgetId = dto.budgetId;
        if (!budgetId) {
          const budgets = await this.dataSource.query<{ id: string }[]>(
            `SELECT id FROM budgets
             WHERE owner_id = $1 AND status IN ('ACTIVE', 'PLANNED') AND nulled_at IS NULL
             ORDER BY is_default DESC, created_at DESC LIMIT 1`,
            [responderId],
          );
          budgetId = budgets[0]?.id;
        }

        if (budgetId) {
          // Resolve default want-bucket category (categories are global, not user-scoped)
          let categoryId = dto.categoryId;
          if (!categoryId) {
            const cats = await this.dataSource.query<{ id: string }[]>(
              `SELECT id FROM categories
               WHERE bucket = 'wants' AND is_selectable = true AND nulled_at IS NULL
               ORDER BY created_at ASC LIMIT 1`,
            );
            categoryId = cats[0]?.id;
          }

          const expenseName = `Viaje: ${group.name}`;
          const rows = await this.dataSource.query<{ id: string }[]>(
            `INSERT INTO expenses_planned
               (name, expected_amount, due_date, status, is_essential, budget_id, category_id, group_id)
             VALUES ($1, $2, $3, 'PLANNED', false, $4, $5, $6)
             RETURNING id`,
            [expenseName, amount, new Date(), budgetId, categoryId ?? null, groupId],
          );
          const expenseId = rows[0]?.id;
          if (expenseId) expense = { id: expenseId, name: expenseName, expectedAmount: amount };
        } else {
          this.logger.warn(
            this.context,
            `No hay presupuesto disponible para crear gasto de invitación`,
          );
        }
      }
    }

    // Notify organizer
    try {
      const responderProfiles = await this.getMemberProfiles([responderId]);
      const responder = responderProfiles.get(responderId);
      await this.notificationsService.createNotification(
        group.ownerId,
        NotificationType.GROUP_TRIP_ACCEPTED,
        {
          senderId: responderId,
          senderHandle: responder?.handle ?? undefined,
          senderDisplayName: responder?.displayName ?? undefined,
          groupId,
          groupName: group.name,
        },
      );
    } catch {
      this.logger.warn(this.context, `No se pudo enviar notificación de aceptación al organizador`);
    }

    return { accepted: true, expense };
  }

  private async assertMembership(groupId: string, userId: string): Promise<void> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.ownerId === userId) return;
    const member = await this.memberRepository.findOne(groupId, userId);
    if (!member) throw new ForbiddenException('No tienes acceso a este grupo');
  }

  private async assertOrganizerRole(groupId: string, userId: string): Promise<void> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.ownerId === userId) return;
    const member = await this.memberRepository.findOne(groupId, userId);
    if (!member || !['ORGANIZER', 'CO_ORGANIZER'].includes(member.role)) {
      throw new ForbiddenException('Se requiere rol de organizador o co-organizador');
    }
  }

  private async assertCanActOnExpense(
    groupId: string,
    expenseId: string,
    userId: string,
  ): Promise<void> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.ownerId === userId) return;

    const member = await this.memberRepository.findOne(groupId, userId);
    if (!member) throw new ForbiddenException('No tienes acceso a este grupo');

    if (['ORGANIZER', 'CO_ORGANIZER'].includes(member.role)) return;

    const expense = await this.expenseRepository.findById(expenseId);
    if (expense?.responsibleUserId === userId) return;

    throw new ForbiddenException('No tienes permisos para actuar sobre este gasto');
  }

  private async getUserHandles(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.dataSource.query<{ id: string; handle: string }[]>(
      `SELECT id, handle FROM users WHERE id = ANY($1) AND nulled_at IS NULL`,
      [userIds],
    );
    return new Map(rows.map((r) => [r.id, r.handle]));
  }

  private async getMemberProfiles(
    userIds: string[],
  ): Promise<Map<string, { handle: string | null; displayName: string | null }>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.dataSource.query<
      { id: string; handle: string | null; display_name: string | null }[]
    >(
      `SELECT u.id, u.handle, up.display_name
       FROM users u
       LEFT JOIN user_profile up ON up.user_id = u.id
       WHERE u.id = ANY($1) AND u.nulled_at IS NULL`,
      [userIds],
    );
    return new Map(
      rows.map((r) => [r.id, { handle: r.handle ?? null, displayName: r.display_name ?? null }]),
    );
  }
}
