import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';
import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { ExpenseService } from '../../application/services/expense.service';
import {
  CreateExpensePlanDto,
  CreateUnplannedExpenseDto,
  UpdateExpenseDto,
} from '../dto/expense.dto';
import { GetPlannedExpensesQueryDto } from '../dto/expense.query.dto';
import {
  CompletePlannedExpenseResponseDto,
  PlannedExpensesResponseDto,
  UnplannedExpenseResponseDto,
} from '../dto/expense.response.dto';

@Controller(['expense', 'expenses'])
export class ExpenseController {
  private readonly context = ExpenseController.name;
  constructor(
    private readonly logger: LoggerProviderService,
    private readonly expenseService: ExpenseService,
  ) {}

  @Post('/plan')
  @UseGuards(AuthGuard('jwt'))
  async plan(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: CreateExpensePlanDto,
  ) {
    this.logger.info(this.context, 'planning expense');

    return await this.expenseService.addPlan(body, user.userId);
  }

  @Post('/unplanned')
  @ApiOperation({ summary: 'Registrar un gasto no planificado y generar su transaccion' })
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiCreatedResponse({ type: UnplannedExpenseResponseDto })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Budget is not active')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Budget not found')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Category not found')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async createUnplanned(@CurrentUser() user: JwtPayload, @Body() body: CreateUnplannedExpenseDto) {
    this.logger.info(this.context, 'Creating unplanned expense');
    return await this.expenseService.createUnplannedExpense({
      userId: user.userId,
      amount: body.amount,
      categoryId: body.categoryId,
      description: body.description,
      budgetId: body.budgetId,
      date: new Date(body.date),
    });
  }

  @Get('/')
  @ApiOperation({ summary: 'Listar gastos planificados con filtros' })
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiResponse({
    status: 200,
    type: PlannedExpensesResponseDto,
  })
  async findAll(@CurrentUser() user: JwtPayload, @Query() query: GetPlannedExpensesQueryDto) {
    return await this.expenseService.findAll(query, user.userId);
  }

  @Patch('/:id/complete')
  @ApiOperation({
    summary: 'Marcar un gasto planificado como pagado y generar su transacción',
  })
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del gasto planificado',
    example: '0a6c0b5c-5d75-4cb6-8fd0-4f3185806c1f',
  })
  @ApiOkResponse({ type: CompletePlannedExpenseResponseDto })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Este gasto ya fue pagado')
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Este gasto está cancelado')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Planned expense not found')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async completePlannedExpense(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, 'Complete planned expense');
    return await this.expenseService.completePlannedExpense(id, user.userId);
  }

  @Patch('/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Actualizar un gasto planificado' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del gasto planificado',
    example: '0a6c0b5c-5d75-4cb6-8fd0-4f3185806c1f',
  })
  @ApiOkResponse({ description: 'Gasto planificado actualizado exitosamente' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Planned expense not found')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async updatePlannedExpense(
    @Param('id') id: string,
    @Body() updateData: UpdateExpenseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.info(this.context, 'Update planned expense');
    const { dueDate, ...rest } = updateData;
    return await this.expenseService.updatePlannedExpense(id, user.userId, {
      ...rest,
      ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
    });
  }

  @Delete('/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Cancelar un gasto planificado (soft delete)' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del gasto planificado',
    example: '0a6c0b5c-5d75-4cb6-8fd0-4f3185806c1f',
  })
  @ApiOkResponse({ description: 'Gasto planificado cancelado exitosamente' })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'No se puede cancelar un gasto ya pagado')
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Este gasto ya está cancelado')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Planned expense not found')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async cancelPlannedExpense(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, 'Cancel planned expense');
    return await this.expenseService.cancelPlannedExpense(id, user.userId);
  }
}
