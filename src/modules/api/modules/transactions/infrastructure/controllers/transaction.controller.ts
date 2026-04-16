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
  ApiResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';

import { TransactionService } from '../../application/services/transaction.service';
import { TransactionFilters } from '../../domain/transaction';
import { CreateManualTransactionDto } from '../dto/create-manual-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';

@Controller('transactions')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  // transaction.controller.ts
  @Get('budget/:budgetId')
  @ApiOperation({ summary: 'Listar transacciones por presupuesto' })
  @ApiOkResponse({ description: 'Lista de transacciones con filtros y paginación' })
  async findByBudget(
    @Param('budgetId') budgetId: string,
    @Query('type') type?: 'income' | 'expense' | 'savings' | undefined,
    @Query('categoryId') categoryId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const query: TransactionFilters = {
      type,
      categoryId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: Number(page),
      limit: Number(limit),
    };
    const { data, pagination } = await this.transactionService.findByBudget(budgetId, query);
    return { transactions: data, pagination };
  }

  @Post()
  @ApiOperation({ summary: 'Crear una transacción manual' })
  @ApiCreatedResponse({ description: 'Transacción creada exitosamente' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Budget is not active' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Amount must be greater than 0' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Budget not found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Account not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async createManual(@Body() body: CreateManualTransactionDto, @CurrentUser() user: JwtPayload) {
    return await this.transactionService.createManual(body, user.userId);
  }

  @Patch('/:id')
  @ApiOperation({ summary: 'Actualizar una transacción' })
  @ApiOkResponse({ description: 'Transacción actualizada exitosamente' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Amount must be greater than 0' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Transaction not found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async updateTransaction(
    @Param('id') id: string,
    @Body() updateData: UpdateTransactionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.transactionService.updateTransaction(id, user.userId, updateData);
  }

  @Delete('/:id')
  @ApiOperation({ summary: 'Eliminar una transacción (soft delete)' })
  @ApiOkResponse({ description: 'Transacción eliminada exitosamente' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Transaction not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async softDeleteTransaction(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.transactionService.softDeleteTransaction(id, user.userId);
  }
}
