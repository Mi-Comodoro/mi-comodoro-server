import { Body, Controller, Get, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';
import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';

import { PlannedSavingService } from '../../application/services/planned-saving.service';
import { AssignGoalDto } from '../dto/assign-goal.dto';
import { CreatePlannedSavingDto } from '../dto/create-planned-saving.dto';

@ApiTags('planned-savings')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'))
@Controller('planned-savings')
export class PlannedSavingController {
  constructor(private readonly plannedSavingService: PlannedSavingService) {}

  @Post('/')
  @ApiOperation({ summary: 'Crear ahorro planificado manualmente vinculado a un ingreso' })
  @ApiBody({ type: CreatePlannedSavingDto })
  @ApiCreatedResponse({ description: 'Ahorro planificado creado exitosamente' })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'No autorizado')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Meta, presupuesto o ingreso no encontrado')
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Datos inválidos o presupuesto inactivo')
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePlannedSavingDto) {
    return await this.plannedSavingService.create(user.userId, dto);
  }

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

  @Patch(':id/goal')
  @ApiOperation({ summary: 'Asignar una meta de ahorro a un ahorro planificado sin meta' })
  @ApiParam({ name: 'id', type: String, description: 'UUID del ahorro planificado' })
  @ApiBody({ type: AssignGoalDto })
  @ApiOkResponse({ description: 'Meta asignada exitosamente' })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'No autorizado')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Ahorro planificado o meta no encontrada')
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'El ahorro no está pendiente o la meta no tiene cuenta')
  async assignGoal(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AssignGoalDto,
  ) {
    return await this.plannedSavingService.assignGoal(id, dto.savingGoalId, user.userId);
  }
}
