import { Body, Controller, Get, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';
import { LoggerProviderService } from '@/core/providers';

import { PlannedIncomeService } from '../../application/services/planned-income.service';
import {
  CreateManualPlannedIncomeDto,
  MarkPlannedIncomeAsReceivedResponseDto,
  PlannedIncomeListResponseDto,
  PlannedIncomeResponseDto,
} from '../dto/planned-income.dto';

@ApiTags('planned-incomes')
@Controller('planned-incomes')
export class PlannedIncomeController {
  private readonly context: string = PlannedIncomeController.name;
  constructor(
    private readonly logger: LoggerProviderService,
    private readonly plannedIncomeService: PlannedIncomeService,
  ) {}

  @Post('/')
  @ApiOperation({ summary: 'Crear un ingreso planificado puntual para un presupuesto' })
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiCreatedResponse({ type: PlannedIncomeResponseDto })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Amount must be greater than 0')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Budget not found')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async createManual(@Body() body: CreateManualPlannedIncomeDto) {
    this.logger.info(this.context, 'Creating manual planned income');
    return await this.plannedIncomeService.createManual(body);
  }

  @Get('/:budgetId')
  @ApiOperation({ summary: 'Listar ingresos planificados por presupuesto' })
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiParam({
    name: 'budgetId',
    type: String,
    description: 'UUID del presupuesto',
    example: 'a4f5cbfc-8f34-4038-92f1-3eff825a70c6',
  })
  @ApiOkResponse({ type: PlannedIncomeListResponseDto })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async getMonthlyIncomeSum(@Param('budgetId') budgetId: string) {
    this.logger.info(this.context, `Calculating monthly income sum for month: ${budgetId}`);
    return await this.plannedIncomeService.getByBudgetId(budgetId);
  }

  @Get('/')
  @ApiOperation({ summary: 'Listar todos los ingresos planificados' })
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({ type: PlannedIncomeListResponseDto })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async getAllMonthlyIncome() {
    this.logger.info(this.context, `Calculating monthly incomes`);
    return await this.plannedIncomeService.findAll();
  }

  @Patch('/:id')
  @ApiOperation({
    summary: 'Marcar un ingreso planificado como recibido y generar sus ahorros planificados',
  })
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del ingreso planificado',
    example: '0a6c0b5c-5d75-4cb6-8fd0-4f3185806c1f',
  })
  @ApiOkResponse({ type: MarkPlannedIncomeAsReceivedResponseDto })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Invalid income amount')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Planned Income not found')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async markAsReceive(@Param('id') id: string) {
    this.logger.info(this.context, 'Mark income as receive');
    return await this.plannedIncomeService.markAsReceive(id);
  }
}
