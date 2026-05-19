import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';
import { LoggerProviderService } from '@/core/providers';

import { PlansService } from '../../application/services/plans.service';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  private readonly context: string = PlansController.name;

  constructor(
    private readonly logger: LoggerProviderService,
    private readonly plansService: PlansService,
  ) {}

  @Get('/')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener planes públicos disponibles' })
  @ApiOkResponse({ description: 'Lista de planes públicos' })
  @ApiErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, 'Internal server error')
  async getPublicPlans() {
    this.logger.info(this.context, 'Getting public plans');
    return this.plansService.getPublicPlans();
  }
}
