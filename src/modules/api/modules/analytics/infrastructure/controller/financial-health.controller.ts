import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';
import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { FinancialHealthService } from '../../application/financial-health.service';
import { FinancialHealthScoreResponseDto } from '../dto/financial-health-score.response.dto';

@ApiTags('analytics')
@Controller('analytics')
export class FinancialHealthController {
  private readonly context = FinancialHealthController.name;

  constructor(
    private readonly logger: LoggerProviderService,
    private readonly financialHealthService: FinancialHealthService,
  ) {}

  @Get('/financial-health-score')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Obtener el score de salud financiera del usuario',
    description:
      'Calcula y retorna el score financiero con 4 pilares (flujo de caja, ahorro, gastos, deudas). ' +
      'Si ya fue calculado en la última hora, retorna el score en cache.',
  })
  @ApiOkResponse({ type: FinancialHealthScoreResponseDto })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Token inválido o expirado')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Finanzas no encontradas para el usuario')
  async getFinancialHealthScore(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Solicitando score financiero para usuario ${user.userId}`);
    return this.financialHealthService.getOrCalculateScore(user.userId);
  }
}
