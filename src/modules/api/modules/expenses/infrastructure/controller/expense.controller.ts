import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { LoggerProviderService } from '@/core/providers';

import { ExpenseService } from '../../application/services/expense.service';
import { CreateExpensePlanDto } from '../dto/expense.dto';
import { GetPlannedExpensesQueryDto } from '../dto/expense.query.dto';
import { PlannedExpensesResponseDto } from '../dto/expense.response.dto';

@Controller('expense')
export class ExpenseController {
  private readonly context = ExpenseController.name;
  constructor(
    private readonly logger: LoggerProviderService,
    private readonly expenseService: ExpenseService,
  ) {}
  @Post('/plan')
  @UseGuards(AuthGuard('jwt'))
  async plan(
    @Body()
    body: CreateExpensePlanDto,
  ) {
    this.logger.info(this.context, 'planning expense');

    return await this.expenseService.addPlan(body);
  }

  @Get('/')
  @ApiOperation({ summary: 'Listar gastos planificados con filtros' })
  @ApiResponse({
    status: 200,
    type: PlannedExpensesResponseDto,
  })
  async findAll(@Query() query: GetPlannedExpensesQueryDto) {
    return await this.expenseService.findAll(query);
  }
}
