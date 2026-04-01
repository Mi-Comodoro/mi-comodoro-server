import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { StringValue } from 'ms';

import { UserEntity } from '@/modules/api/modules/users/infrastructure/database/user.entity';
import { UserRepositoryImpl } from '@/modules/api/modules/users/infrastructure/repository/user.repository.impl';

import { JwtProvider } from './jwt.provider';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN as StringValue,
      },
    }),
    PassportModule,
  ],
  providers: [
    JwtProvider,
    JwtStrategy,
    {
      provide: 'UserRepository',
      useClass: UserRepositoryImpl,
    },
  ],
  exports: [JwtProvider, JwtModule],
})
export class SecurityJwtModule {}
