import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';
import { BudgetEntity } from '@/modules/api/modules/budgets/infrastructure/database/entities/budget.entity';
import { NotificationsModule } from '@/modules/api/modules/notifications/notifications.module';
import { TransactionEntity } from '@/modules/api/modules/transactions/infrastructure/database/entities/transaction.entity';
import { UserProfileEntity } from '@/modules/api/modules/user-profile/infrastructure/database/entities/user-profile.entity';
import { UserEntity } from '@/modules/api/modules/users/infrastructure/database/user.entity';

import { AdminAnnouncementsService } from './application/admin-announcements.service';
import { AdminMetricsService } from './application/admin-metrics.service';
import { AdminUsersService } from './application/admin-users.service';
import { AuditLogService } from './application/audit-log.service';
import { AdminAnnouncementsController } from './infrastructure/controller/admin-announcements.controller';
import { AdminConfigController } from './infrastructure/controller/admin-config.controller';
import { AdminMetricsController } from './infrastructure/controller/admin-metrics.controller';
import { AdminUsersController } from './infrastructure/controller/admin-users.controller';
import { AuditLogController } from './infrastructure/controller/audit-log.controller';
import { AnnouncementEntity } from './infrastructure/database/entities/announcement.entity';
import { AuditLogEntity } from './infrastructure/database/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      UserProfileEntity,
      BudgetEntity,
      TransactionEntity,
      AnnouncementEntity,
      AuditLogEntity,
    ]),
    NotificationsModule,
  ],
  providers: [
    AdminUsersService,
    AdminMetricsService,
    AdminAnnouncementsService,
    AuditLogService,
    LoggerProviderService,
  ],
  controllers: [
    AdminUsersController,
    AdminMetricsController,
    AdminConfigController,
    AdminAnnouncementsController,
    AuditLogController,
  ],
})
export class AdminModule {}
