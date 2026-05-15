import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { IsNull, Repository } from 'typeorm';

import { GROUP_ROLES_KEY } from '@/common/decorators/group-roles.decorator';
import type { JwtPayload } from '@/core/config/security/jwt/jwt.payload';

import type { MemberRole } from '../../domain/group-member';
import { GroupMemberEntity } from '../database/entities/group-member.entity';

@Injectable()
export class GroupRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(GroupMemberEntity)
    private readonly memberRepo: Repository<GroupMemberEntity>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<MemberRole[]>(GROUP_ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const user = req.user as JwtPayload;
    const userId = user?.userId;
    const rawGroupId = req.params?.['id'] ?? req.params?.['groupId'];
    const groupId = Array.isArray(rawGroupId) ? rawGroupId[0] : rawGroupId;

    if (!userId || !groupId) throw new ForbiddenException();

    const member = await this.memberRepo.findOne({
      where: { groupId, userId, isActive: true, nulledAt: IsNull() },
    });

    if (!member) throw new ForbiddenException();

    return requiredRoles.includes(member.role);
  }
}
