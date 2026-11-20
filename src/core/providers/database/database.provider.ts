import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { getErrorMessage } from '@/common/helpers/error.helpers';
import { LoggerProviderService } from '@/core/providers/logs';

@Injectable()
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

      this.logger.info(this.context, 'Conexión a base de datos establecida');

      await this.logMigrationStatus();
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      this.logger.error(this.context, 'Error de conexión a base de datos');
      this.logger.error(this.context, message);
      process.exit(1);
    }
  }

  private async logMigrationStatus() {
    try {
      const rows: Array<{ name: string; timestamp: string }> = await this.dataSource.query(
        `SELECT name, timestamp FROM migrations ORDER BY timestamp ASC`,
      );

      if (!rows.length) {
        this.logger.warn(this.context, 'No hay migraciones aplicadas');
        return;
      }

      this.logger.info(this.context, `Migraciones aplicadas (${rows.length}):`);
      rows.forEach((m) => this.logger.info(this.context, `  ✓ ${m.name}`));
    } catch {
      // La tabla migrations puede no existir en entornos de prueba
    }
  }
}
