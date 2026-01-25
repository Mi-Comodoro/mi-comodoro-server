import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';

import { JwtProvider } from './jwt.provider';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN as StringValue,
      },
    }),
    PassportModule,
  ],
  providers: [JwtProvider, JwtStrategy],
  exports: [JwtProvider],
})
export class SecurityJwtModule {}
