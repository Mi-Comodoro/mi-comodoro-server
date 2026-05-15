import { Controller, Get, HttpStatus, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';

import { PlannedSavingService } from '../../application/services/planned-saving.service';

@ApiTags('planned-savings')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'))
@Controller('planned-savings')
export class PlannedSavingController {
  constructor(private readonly plannedSavingService: PlannedSavingService) {}

  @Get('budget/:budgetId')
  @ApiOperation({ summary: 'Listar ahorros planificados por presupuesto' })
  @ApiParam({ name: 'budgetId', type: String, description: 'UUID del presupuesto' })
  @ApiOkResponse({ description: 'Lista de ahorros planificados' })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'No autorizado')
  async findByBudget(@Param('budgetId') budgetId: string) {
    return this.plannedSavingService.findByBudget(budgetId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Marcar ahorro planificado como completado' })
  @ApiParam({ name: 'id', type: String, description: 'UUID del ahorro planificado' })
  @ApiOkResponse({ description: 'Ahorro marcado como completado' })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'No autorizado')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Ahorro planificado no encontrado')
  async savingDone(@Param('id') id: string) {
    return await this.plannedSavingService.markAsDone(id);
  }
}
