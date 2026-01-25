import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SecurityJwtModule } from '@/core/config/security/jwt/jwt.module';

import { AccountEntity } from '../account/infrastructure/database/account.entity';
import { AccountRepositoryImpl } from '../account/infrastructure/repository/account.repository.impl';
import { UserEntity } from '../users/infrastructure/database/user.entity';
import { UserRepositoryImpl } from '../users/infrastructure/repository/user.repository.impl';
import { AuthService } from './application/auth.service';
import { AuthController } from './infrastructure/controller/auth.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, AccountEntity]), SecurityJwtModule],
  providers: [
    AuthService,
    {
      provide: 'UserRepository',
      useClass: UserRepositoryImpl,
    },
    {
      provide: 'AccountRepository',
      useClass: AccountRepositoryImpl,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
