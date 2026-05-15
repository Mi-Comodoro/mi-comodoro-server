import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';
import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { IncomesService } from '../../application/services/incomes.service';

@ApiTags('incomes')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'))
@Controller('incomes')
export class IncomesController {
  private context: string = IncomesController.name;
  constructor(
    private readonly logger: LoggerProviderService,
    private readonly incomesService: IncomesService,
  ) {}

  @Get('/current')
  @ApiOperation({ summary: 'Obtener sumatoria de ingresos del mes actual' })
  @ApiQuery({ name: 'month', type: Number, description: 'Mes (1-12)' })
  @ApiQuery({ name: 'year', type: Number, description: 'Año (ej: 2026)' })
  @ApiOkResponse({ description: 'Sumatoria de ingresos del mes' })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'No autorizado')
  async getMonthlyIncomeSum(
    @CurrentUser() user: JwtPayload,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    this.logger.info(
      this.context,
      `Calculating monthly income sum for month: ${month}, year: ${year}`,
    );
    return await this.incomesService.calculateMonthlyIncomeSum(user.userId, month, year);
  }
}
