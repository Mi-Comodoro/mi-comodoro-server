import { Module } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { AccountDeletionService } from './application/services/account-deletion.service';
import { AccountPurgeCron } from './application/services/account-purge.cron';
import { DataExportService } from './application/services/data-export.service';
import { PrivacyController } from './infrastructure/controller/privacy.controller';

@Module({
  controllers: [PrivacyController],
  providers: [AccountDeletionService, DataExportService, AccountPurgeCron, LoggerProviderService],
  exports: [AccountDeletionService],
})
export class PrivacyModule {}
