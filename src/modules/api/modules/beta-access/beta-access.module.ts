import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { AuditLogService } from '../admin/application/audit-log.service';
import { AuditLogEntity } from '../admin/infrastructure/database/entities/audit-log.entity';
import { BetaAccessService } from './application/services/beta-access.service';
import { BetaAccessPurgeCron } from './application/services/beta-access-purge.cron';
import { AdminBetaAccessController } from './infrastructure/controller/admin-beta-access.controller';
import { BetaAccessController } from './infrastructure/controller/beta-access.controller';
import { BetaAccessRequestEntity } from './infrastructure/database/entities/beta-access-request.entity';
import { BetaAccessRepositoryImpl } from './infrastructure/repositories/beta-access.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([BetaAccessRequestEntity, AuditLogEntity])],
  controllers: [BetaAccessController, AdminBetaAccessController],
  providers: [
    BetaAccessService,
    BetaAccessPurgeCron,
    AuditLogService,
    LoggerProviderService,
    { provide: 'BetaAccessRepository', useClass: BetaAccessRepositoryImpl },
  ],
  exports: [BetaAccessService],
})
export class BetaAccessModule {}
