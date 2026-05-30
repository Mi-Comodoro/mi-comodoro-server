import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { NotificationsModule } from '../notifications/notifications.module';
import { UserEntity } from '../users/infrastructure/database/user.entity';
import { UserRepositoryImpl } from '../users/infrastructure/repository/user.repository.impl';
import { FriendshipsService } from './application/services/friendships.service';
import { FriendshipsController } from './infrastructure/controller/friendships.controller';
import { FriendshipEntity } from './infrastructure/database/entities/friendship.entity';
import { FriendshipRepositoryImpl } from './infrastructure/repositories/friendship.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([FriendshipEntity, UserEntity]), NotificationsModule],
  controllers: [FriendshipsController],
  providers: [
    FriendshipsService,
    LoggerProviderService,
    {
      provide: 'FriendshipRepository',
      useClass: FriendshipRepositoryImpl,
    },
    {
      provide: 'UserRepository',
      useClass: UserRepositoryImpl,
    },
  ],
  exports: [FriendshipsService],
})
export class FriendshipsModule {}
