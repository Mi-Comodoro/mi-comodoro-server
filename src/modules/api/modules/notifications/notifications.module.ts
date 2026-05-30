import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { NotificationsService } from './application/services/notifications.service';
import { NotificationsController } from './infrastructure/controller/notifications.controller';
import { NotificationEntity } from './infrastructure/database/entities/notification.entity';
import { NotificationsGateway } from './infrastructure/gateway/notifications.gateway';
import { NotificationRepositoryImpl } from './infrastructure/repositories/notification.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    LoggerProviderService,
    {
      provide: 'NotificationRepository',
      useClass: NotificationRepositoryImpl,
    },
  ],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
