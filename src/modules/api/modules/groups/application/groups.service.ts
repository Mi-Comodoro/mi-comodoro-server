import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import type { GroupExpense } from '../domain/group-expense';
import type { GroupMember } from '../domain/group-member';
import type { GroupContributionRepository } from '../domain/repositories/group-contribution.repository';
import type { GroupExpenseRepository } from '../domain/repositories/group-expense.repository';
import type { GroupMemberRepository } from '../domain/repositories/group-member.repository';
import type { UserGroupRepository } from '../domain/repositories/user-group.repository';
import type { UserGroup } from '../domain/user-group';
import type { CreateGroupExpenseDto } from '../infrastructure/dto/group-expense.dto';
import type {
  AddMemberDto,
  CreateGroupDto,
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
    return { ...group, members };
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
      role: dto.role,
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

  async payExpense(groupId: string, expenseId: string, requesterId: string): Promise<GroupExpense> {
    this.logger.info(this.context, `Paying expense ${expenseId} in group ${groupId}`);
    const expense = await this.expenseRepository.findById(expenseId);
    if (!expense || expense.groupId !== groupId) throw new NotFoundException('Gasto no encontrado');
    await this.assertCanActOnExpense(groupId, expenseId, requesterId);
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
    return this.expenseRepository.updateStatus(expenseId, 'cxp');
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
}
