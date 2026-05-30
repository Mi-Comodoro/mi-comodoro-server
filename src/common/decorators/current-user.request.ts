import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<Request>();

    if (!request.user) throw new UnauthorizedException('User not found');
    return request.user! as JwtPayload;
  },
);
