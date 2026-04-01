import {
  Body,
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';
import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { BudgetService } from '../../application/budget.service';
import { BudgetListResponseDto, BudgetResponseDto, CreateBudgetDto } from '../dto/budget.dto';

@ApiTags('budgets')
@Controller('budgets')
export class BudgetController {
  private readonly context: string = BudgetController.name;

  constructor(
    private readonly logger: LoggerProviderService,
    private readonly budgetService: BudgetService,
  ) {}

  @Post('/')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Crear un presupuesto mensual fuera del onboarding',
    description:
      'Soporta modo empty para crear desde cero y mode clone para clonar la configuracion mensual de un presupuesto previo.',
  })
  @ApiCreatedResponse({ type: BudgetResponseDto })
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Budget already exists for the selected month and year')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Finances not found for user')
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Invalid month value')
  async create(@CurrentUser() user: JwtPayload, @Body() body: CreateBudgetDto) {
    this.logger.info(
      this.context,
      `Creating monthly budget for user ${user.userId}, month: ${body.month}, year: ${body.year}, mode: ${body.mode}`,
    );
    return await this.budgetService.createMonthlyBudget({
      userId: user.userId,
      month: body.month,
      year: body.year,
      mode: body.mode,
      sourceBudgetId: body.sourceBudgetId,
      name: body.name,
    });
  }

  @Get('/current/:financeId/')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Obtener el presupuesto actual o de un periodo especifico por query',
    description: 'Si month y year no se envian, el backend usa el mes y ano actuales del servidor.',
  })
  @ApiParam({
    name: 'financeId',
    type: String,
    description: 'UUID de las finanzas del usuario',
    example: 'b2e070e1-0371-5f73-bec6-9b726c06f930',
  })
  @ApiOkResponse({ type: BudgetResponseDto })
  @ApiQuery({ name: 'month', required: false, type: String, example: '4' })
  @ApiQuery({ name: 'year', required: false, type: Number, example: 2026 })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Budget not found')
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Invalid month value')
  async getCurrentBudget(
    @Param('financeId') financeId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    this.logger.info(
      this.context,
      `Getting current budget for financeId: ${financeId}${month ? `, month: ${month}` : ''}${year ? `, year: ${year}` : ''}`,
    );
    const budget = await this.budgetService.getCurrentBudgetByFinancesId(financeId, month, year);
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    this.logger.info(this.context, `Budget found: ${JSON.stringify(budget)}`);
    return budget;
  }

  @Get('/current/:financeId/:year/:month')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Obtener un presupuesto por periodo usando parametros de ruta',
  })
  @ApiParam({
    name: 'financeId',
    type: String,
    description: 'UUID de las finanzas del usuario',
    example: 'b2e070e1-0371-5f73-bec6-9b726c06f930',
  })
  @ApiParam({ name: 'year', type: String, example: '2026', description: 'Ano objetivo' })
  @ApiParam({
    name: 'month',
    type: String,
    example: 'Abril',
    description: 'Mes objetivo en numero 1-12 o nombre en espanol',
  })
  @ApiOkResponse({ type: BudgetResponseDto })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Budget not found')
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Invalid month value')
  async getCurrentBudgetByParams(
    @Param('financeId') financeId: string,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    this.logger.info(
      this.context,
      `Getting current budget for financeId: ${financeId}, month: ${month}, year: ${year}`,
    );
    const budget = await this.budgetService.getCurrentBudgetByFinancesId(financeId, month, year);
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    this.logger.info(this.context, `Budget found: ${JSON.stringify(budget)}`);
    return budget;
  }

  @Get('/finances/:financeId')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Listar presupuestos por finanzas, opcionalmente filtrados por ano' })
  @ApiParam({
    name: 'financeId',
    type: String,
    description: 'UUID de las finanzas del usuario',
    example: 'b2e070e1-0371-5f73-bec6-9b726c06f930',
  })
  @ApiOkResponse({ type: BudgetListResponseDto })
  @ApiQuery({ name: 'year', required: false, type: Number, example: 2026 })
  async getAllBudgets(@Param('financeId') financeId: string, @Query('year') year?: string) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    this.logger.info(
      this.context,
      `Getting all budgets for financeId: ${financeId}${parsedYear ? `, year: ${parsedYear}` : ''}`,
    );
    return await this.budgetService.getAllBudgetsByFinancesId(financeId, parsedYear);
  }

  @Get('/:budgetId')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Obtener un presupuesto por su ID' })
  @ApiParam({
    name: 'budgetId',
    type: String,
    description: 'UUID del presupuesto',
    example: 'a1d959d0-9260-4e62-adb5-8a615b95e819',
  })
  @ApiOkResponse({ type: BudgetResponseDto })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Budget not found')
  async getBudgetById(@Param('budgetId') budgetId: string) {
    this.logger.info(this.context, `Getting budget by ID: ${budgetId}`);
    return await this.budgetService.getBudgetById(budgetId);
  }

  @Patch('/:budgetId/active')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Activar un presupuesto por su ID' })
  @ApiParam({
    name: 'budgetId',
    type: String,
    description: 'UUID del presupuesto a activar',
    example: 'a1d959d0-9260-4e62-adb5-8a615b95e819',
  })
  @ApiOkResponse({ type: BudgetResponseDto })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Budget not found')
  async active(@Param('budgetId') budgetId: string) {
    this.logger.info(this.context, `Getting budget by ID: ${budgetId}`);
    return await this.budgetService.active(budgetId);
  }
}
