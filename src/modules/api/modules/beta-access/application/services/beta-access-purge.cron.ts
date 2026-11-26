import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { LoggerProviderService } from '@/core/providers';

import { BetaAccessService } from './beta-access.service';

/** Borra a diario las solicitudes que cumplieron su plazo de retención (ver RETENTION_DAYS). */
@Injectable()
export class BetaAccessPurgeCron {
  private readonly context = BetaAccessPurgeCron.name;
  private running = false;

  constructor(
    private readonly service: BetaAccessService,
    private readonly logger: LoggerProviderService,
  ) {}

  @Cron('0 4 * * *')
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.service.purgeExpired();
    } catch (error) {
      this.logger.error(
        this.context,
        'Falló el borrado por retención de solicitudes',
        String(error),
      );
    } finally {
      this.running = false;
    }
  }
}
