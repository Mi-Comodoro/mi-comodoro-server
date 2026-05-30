import { Injectable, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { getErrorMessage } from '@/common/helpers/error.helpers';
import { LoggerProviderService } from '@/core/providers/logs';
import { SeedCategoriesData20260527000000 } from '@/database/migrations/20260527000000-SeedCategoriesData';

Injectable();
export class DatabaseProvider implements OnModuleInit, OnApplicationBootstrap {
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

  async onApplicationBootstrap() {
    try {
      const qr = this.dataSource.createQueryRunner();
      await new SeedCategoriesData20260527000000().up(qr);
      await qr.release();
      this.logger.info(this.context, '🌱 Seed de categorías ejecutado correctamente');
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      this.logger.error(this.context, `❌ Error en seed de categorías: ${message}`);
    }
  }
}
