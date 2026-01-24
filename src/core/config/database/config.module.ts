import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DatabaseConfigService } from './config.service';
import { PostgresModule } from './postgres/postgres.module';

@Module({
  imports: [PostgresModule],
  providers: [ConfigService, DatabaseConfigService],
  exports: [ConfigService, DatabaseConfigService],
})
export class DatabaseConfigModule {}
