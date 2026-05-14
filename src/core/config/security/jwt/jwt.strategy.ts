import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UserRepository } from '@/modules/api/modules/users/domain/user.repository';

import { JwtPayload } from './jwt.payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject('UserRepository') private readonly userRepository: UserRepository) {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findAuthById(payload.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokenVersion = payload.tokenVersion ?? 0;
    const currentVersion = user.tokenVersion ?? 0;

    if (tokenVersion !== currentVersion) {
      throw new UnauthorizedException('Token has been invalidated');
    }

    return {
      userId: payload.userId,
      userProfileId: payload.userProfileId,
      email: payload.email,
      role: payload.role,
      tokenVersion: currentVersion,
    };
  }
}
