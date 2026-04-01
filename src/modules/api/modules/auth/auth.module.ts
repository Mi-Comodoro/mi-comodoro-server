import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SecurityJwtModule } from '@/core/config/security/jwt/jwt.module';

import { UserProfileEntity } from '../user-profile/infrastructure/database/entities/user-profile.entity';
import { UserProfileRepositoryImpl } from '../user-profile/infrastructure/repository/user-profile.repository.impl';
import { UserEntity } from '../users/infrastructure/database/user.entity';
import { UserRepositoryImpl } from '../users/infrastructure/repository/user.repository.impl';
import { AuthService } from './application/auth.service';
import { AuthController } from './infrastructure/controller/auth.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserProfileEntity]), SecurityJwtModule],
  providers: [
    AuthService,
    {
      provide: 'UserRepository',
      useClass: UserRepositoryImpl,
    },
    {
      provide: 'UserProfileRepository',
      useClass: UserProfileRepositoryImpl,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
