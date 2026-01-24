import { Controller, Get, HttpCode } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';

import { LoggerProviderService } from '@/core/providers/logs';

@Controller('health')
export class HealthController {
  private context: string = HealthController.name;
  constructor(
    private readonly logger: LoggerProviderService,
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
  ) {}
  @Get('')
  @HealthCheck()
  @HttpCode(200)
  checkHealth() {
    this.logger.info(this.context, 'Health check endpoint called');
    // TODO: Add more health indicators as needed
    return this.health.check([() => this.http.pingCheck('nestjs-docs', 'https://docs.nestjs.com')]);
  }
}
