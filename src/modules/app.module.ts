import { Module } from '@nestjs/common';

import { InitialConfigModule } from '@/core/config/index';
import { DatabaseModule } from '@/core/modules/database/postgres.module';
import { LoggerProviderModule } from '@/core/providers/logs';

import { ApiModule } from './api/api.module';

@Module({
  imports: [InitialConfigModule, ApiModule, LoggerProviderModule, DatabaseModule],
})
export class AppModule {}
