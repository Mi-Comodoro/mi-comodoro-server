import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { LoggerProviderService } from '@/core/providers';

import { AccountDeletionService } from './account-deletion.service';

/** Cron del borrado permanente. Configurable con ACCOUNT_PURGE_CRON (por defecto, a diario a las 03:30). */
const PURGE_SCHEDULE = process.env.ACCOUNT_PURGE_CRON?.trim() || '30 3 * * *';

@Injectable()
export class AccountPurgeCron {
  private readonly context = AccountPurgeCron.name;
  private running = false;

  constructor(
    private readonly deletionService: AccountDeletionService,
    private readonly logger: LoggerProviderService,
  ) {}

  @Cron(PURGE_SCHEDULE)
  async run(): Promise<void> {
    // Evita que una ejecución lenta se solape con la siguiente
    if (this.running) return;
    this.running = true;
    try {
      await this.deletionService.purgeDue();
    } catch (error) {
      this.logger.error(this.context, 'Falló el borrado permanente programado', String(error));
    } finally {
      this.running = false;
    }
  }
}
