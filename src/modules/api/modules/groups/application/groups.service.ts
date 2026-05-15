import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import type { GroupMember } from '../domain/group-member';
import type { GroupMemberRepository } from '../domain/repositories/group-member.repository';
import type { UserGroupRepository } from '../domain/repositories/user-group.repository';
import type { UserGroup } from '../domain/user-group';
import type {
  AddMemberDto,
  CreateGroupDto,
  UpdateGroupDto,
} from '../infrastructure/dto/groups.dto';

@Injectable()
export class GroupsService {
  private readonly context: string = GroupsService.name;

  constructor(
    @Inject('UserGroupRepository') private readonly groupRepository: UserGroupRepository,
    @Inject('GroupMemberRepository') private readonly memberRepository: GroupMemberRepository,
    private readonly logger: LoggerProviderService,
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
      status: 'active',
    });
    const member = await this.memberRepository.save({
      groupId: group.id,
      userId,
      role: 'OWNER',
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
      throw new ForbiddenException('Solo el owner puede editar el grupo');
    return this.groupRepository.save({ ...group, ...dto, id });
  }

  async deleteGroup(id: string, userId: string): Promise<void> {
    this.logger.info(this.context, `Deleting group ${id}`);
    const group = await this.groupRepository.findById(id);
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.ownerId !== userId)
      throw new ForbiddenException('Solo el owner puede eliminar el grupo');
    await this.groupRepository.softDelete(id);
  }

  async addMember(groupId: string, requesterId: string, dto: AddMemberDto): Promise<GroupMember> {
    this.logger.info(this.context, `Adding member ${dto.userId} to group ${groupId}`);
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.ownerId !== requesterId)
      throw new ForbiddenException('Solo el owner puede invitar miembros');
    const existing = await this.memberRepository.findOne(groupId, dto.userId);
    if (existing) throw new ConflictException('El usuario ya es miembro del grupo');
    return this.memberRepository.save({
      groupId,
      userId: dto.userId,
      role: dto.role,
      isActive: true,
    });
  }

  async removeMember(groupId: string, targetUserId: string, requesterId: string): Promise<void> {
    this.logger.info(this.context, `Removing member ${targetUserId} from group ${groupId}`);
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (requesterId !== targetUserId && group.ownerId !== requesterId) {
      throw new ForbiddenException('Solo el owner o el propio usuario puede salir del grupo');
    }
    const member = await this.memberRepository.findOne(groupId, targetUserId);
    if (!member) throw new NotFoundException('Miembro no encontrado en el grupo');
    if (!member.id) throw new NotFoundException('Miembro no encontrado en el grupo');
    await this.memberRepository.softDelete(member.id);
  }

  private async assertMembership(groupId: string, userId: string): Promise<void> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.ownerId === userId) return;
    const member = await this.memberRepository.findOne(groupId, userId);
    if (!member) throw new ForbiddenException('No tienes acceso a este grupo');
  }
}
