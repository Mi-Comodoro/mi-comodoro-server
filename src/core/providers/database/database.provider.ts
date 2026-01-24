import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { getErrorMessage } from '@/common/helpers/error.helpers';
import { LoggerProviderService } from '@/core/providers/logs';

Injectable();
export class DatabaseProvider implements OnModuleInit {
  private readonly context = DatabaseProvider.name;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly logger: LoggerProviderService,
  ) {}

  async onModuleInit() {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      this.logger.info(this.context, '📦 Database connected successfully');
    } catch (error: unknown) {
      const message = getErrorMessage(error);

      this.logger.error(this.context, '❌ DATABASE CONNECTION ERROR');
      this.logger.error(this.context, message);

      process.exit(1);
    }
  }
}
