import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { AdminGuard } from '@/common/guards/admin.guard';
import { LoggerProviderService } from '@/core/providers';

import { AdminMetricsService } from '../../application/admin-metrics.service';
import { AdminMetricsSummaryDto, UserGrowthResponseDto } from '../dto/admin-metrics.dto';

@ApiTags('admin')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin/metrics')
export class AdminMetricsController {
  private readonly context = AdminMetricsController.name;

  constructor(
    private readonly logger: LoggerProviderService,
    private readonly adminMetricsService: AdminMetricsService,
  ) {}

  @Get('user-growth')
  @ApiOperation({ summary: 'Serie temporal de nuevos usuarios por período' })
  @ApiQuery({ name: 'period', enum: ['30d', '90d', '12m'], required: true })
  @ApiOkResponse({ description: 'Serie de crecimiento de usuarios', type: UserGrowthResponseDto })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN o SUPER_ADMIN' })
  async getUserGrowth(@Query('period') period: '30d' | '90d' | '12m' = '30d') {
    this.logger.info(this.context, `Obteniendo crecimiento de usuarios — period=${period}`);
    return this.adminMetricsService.getUserGrowth(period);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumen de métricas del dashboard admin con deltas vs mes anterior' })
  @ApiOkResponse({ description: 'Métricas resumidas del sistema', type: AdminMetricsSummaryDto })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN o SUPER_ADMIN' })
  async getSummary() {
    this.logger.info(this.context, 'Obteniendo resumen de métricas admin');
    return this.adminMetricsService.getSummary();
  }
}
