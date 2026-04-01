import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { IncomesService } from '../../application/services/incomes.service';

@Controller('incomes')
export class IncomesController {
  private context: string = IncomesController.name;
  constructor(
    private readonly logger: LoggerProviderService,
    private readonly incomesService: IncomesService,
  ) {}
  @Get('/current')
  @UseGuards(AuthGuard('jwt'))
  async getMonthlyIncomeSum(
    @CurrentUser() user: JwtPayload,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    this.logger.info(
      this.context,
      `Calculating monthly income sum for month: ${month}, year: ${year}`,
    );
    // Aquí iría la lógica para calcular la sumatoria de ingresos del mes y año
    // Por ahora, retorna un valor de ejemplo
    return await this.incomesService.calculateMonthlyIncomeSum(user.userId, month, year);
  }
}
