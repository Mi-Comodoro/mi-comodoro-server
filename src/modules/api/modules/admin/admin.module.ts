import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserProfileEntity } from '@/modules/api/modules/user-profile/infrastructure/database/entities/user-profile.entity';
import { UserEntity } from '@/modules/api/modules/users/infrastructure/database/user.entity';

import { AdminUsersService } from './application/admin-users.service';
import { AdminUsersController } from './infrastructure/controller/admin-users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserProfileEntity])],
  providers: [AdminUsersService],
  controllers: [AdminUsersController],
})
export class AdminModule {}
