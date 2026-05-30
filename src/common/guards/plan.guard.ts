import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserRole } from '@/modules/api/modules/users/domain/user-role.enum';

import { PLAN_KEY } from '../decorators/requires-plan.decorator';
import type { AccountType } from '../enums/account-type.enum';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AccountType[]>(PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user) return true;

    if ([UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role)) return true;

    if (!required.includes(user.accountType)) {
      throw new ForbiddenException('PLAN_LIMIT_REACHED');
    }

    return true;
  }
}
