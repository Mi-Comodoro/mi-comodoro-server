import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';
import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { AnalyticsCombinedService } from '../../application/analytics-combined.service';
import { CashFlowForecastDto } from '../../application/dto/cash-flow-forecast.dto';
import { DebtProjectionDto } from '../../application/dto/debt-projection.dto';
import { NetPositionDto } from '../../application/dto/net-position.dto';
import { SavingsTrendDto } from '../../application/dto/savings-trend.dto';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('bearerAuth')
export class AnalyticsCombinedController {
  private readonly context = AnalyticsCombinedController.name;

  constructor(
    private readonly logger: LoggerProviderService,
    private readonly analyticsCombinedService: AnalyticsCombinedService,
  ) {}

  @Get('savings-trend')
  @ApiOperation({ summary: 'Tendencia de ahorro de los últimos 6 meses' })
  @ApiOkResponse({ type: SavingsTrendDto })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Token inválido o expirado')
  async getSavingsTrend(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Solicitando tendencia de ahorro para usuario ${user.userId}`);
    return this.analyticsCombinedService.getSavingsTrend(user.userId);
  }

  @Get('net-position')
  @ApiOperation({ summary: 'Posición neta financiera actual' })
  @ApiOkResponse({ type: NetPositionDto })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Token inválido o expirado')
  async getNetPosition(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Solicitando posición neta para usuario ${user.userId}`);
    return this.analyticsCombinedService.getNetPosition(user.userId);
  }

  @Get('debt-projection')
  @ApiOperation({ summary: 'Proyección de deuda 6 meses (lineal, simplificada)' })
  @ApiOkResponse({ type: DebtProjectionDto })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Token inválido o expirado')
  async getDebtProjection(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Solicitando proyección de deuda para usuario ${user.userId}`);
    return this.analyticsCombinedService.getDebtProjection(user.userId);
  }

  @Get('cash-flow-forecast')
  @ApiOperation({ summary: 'Pronóstico de flujo de caja 3 meses' })
  @ApiOkResponse({ type: CashFlowForecastDto })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Token inválido o expirado')
  async getCashFlowForecast(@CurrentUser() user: JwtPayload) {
    this.logger.info(
      this.context,
      `Solicitando pronóstico de flujo de caja para usuario ${user.userId}`,
    );
    return this.analyticsCombinedService.getCashFlowForecast(user.userId);
  }
}
