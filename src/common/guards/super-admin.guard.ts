import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

import type { JwtPayload } from '@/core/config/security/jwt/jwt.payload';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const user = req.user as JwtPayload | undefined;
    if (user?.role !== 'super_admin') throw new ForbiddenException();
    return true;
  }
}
