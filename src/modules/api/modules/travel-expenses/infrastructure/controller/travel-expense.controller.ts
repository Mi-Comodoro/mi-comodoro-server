import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorator/current-user.request';
import type { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { TravelExpenseService } from '../../application/services/travel-expense.service';
import {
  CreateTravelExpenseDto,
  SettleAssignmentDto,
  UpdateTravelExpenseDto,
} from '../dto/travel-expense.dto';

@ApiTags('Travel Expenses')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'))
@Controller('travel-expenses')
export class TravelExpenseController {
  private readonly context = TravelExpenseController.name;

  constructor(
    private readonly logger: LoggerProviderService,
    private readonly travelExpenseService: TravelExpenseService,
  ) {}

  @Post('/')
  @ApiOperation({ summary: 'Crear gasto de viaje con split automático' })
  @ApiCreatedResponse({ description: 'Gasto creado con sus asignaciones' })
  @ApiForbiddenResponse({ description: 'No eres miembro del grupo' })
  async createExpense(@CurrentUser() user: JwtPayload, @Body() dto: CreateTravelExpenseDto) {
    this.logger.info(this.context, `Creando gasto para grupo ${dto.groupId}`);
    return this.travelExpenseService.createExpense(user.userId, dto);
  }

  @Get('/group/:groupId')
  @ApiOperation({ summary: 'Listar gastos de un grupo con sus asignaciones' })
  @ApiParam({ name: 'groupId', type: String, description: 'UUID del grupo' })
  @ApiOkResponse({ description: 'Lista de gastos del grupo' })
  @ApiForbiddenResponse({ description: 'No eres miembro del grupo' })
  async getByGroup(@Param('groupId') groupId: string, @CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Listando gastos del grupo ${groupId}`);
    return this.travelExpenseService.getByGroup(groupId, user.userId);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Obtener detalle de un gasto con sus asignaciones' })
  @ApiParam({ name: 'id', type: String, description: 'UUID del gasto' })
  @ApiOkResponse({ description: 'Detalle del gasto' })
  @ApiNotFoundResponse({ description: 'Gasto no encontrado' })
  @ApiForbiddenResponse({ description: 'No eres miembro del grupo' })
  async getById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Obteniendo gasto ${id}`);
    return this.travelExpenseService.getById(id, user.userId);
  }

  @Patch('/:id')
  @ApiOperation({ summary: 'Editar gasto (solo el creador)' })
  @ApiParam({ name: 'id', type: String, description: 'UUID del gasto' })
  @ApiOkResponse({ description: 'Gasto actualizado' })
  @ApiNotFoundResponse({ description: 'Gasto no encontrado' })
  @ApiForbiddenResponse({ description: 'Solo el creador puede editar' })
  async updateExpense(
    @Param('id') id: string,
    @Body() dto: UpdateTravelExpenseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.info(this.context, `Actualizando gasto ${id}`);
    return this.travelExpenseService.updateExpense(id, user.userId, dto);
  }

  @Delete('/:id')
  @ApiOperation({ summary: 'Eliminar gasto (soft delete, solo el creador)' })
  @ApiParam({ name: 'id', type: String, description: 'UUID del gasto' })
  @ApiOkResponse({ description: 'Gasto eliminado' })
  @ApiNotFoundResponse({ description: 'Gasto no encontrado' })
  @ApiForbiddenResponse({ description: 'Solo el creador puede eliminar' })
  async deleteExpense(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Eliminando gasto ${id}`);
    return this.travelExpenseService.deleteExpense(id, user.userId);
  }

  @Post('/:id/settlements')
  @ApiOperation({ summary: 'Marcar asignación de usuario como saldada (OWNER o EDITOR)' })
  @ApiParam({ name: 'id', type: String, description: 'UUID del gasto' })
  @ApiOkResponse({ description: 'Asignación marcada como saldada' })
  @ApiNotFoundResponse({ description: 'Gasto o asignación no encontrado' })
  @ApiForbiddenResponse({ description: 'Requiere rol OWNER o EDITOR en el grupo' })
  async settleAssignment(
    @Param('id') expenseId: string,
    @Body() dto: SettleAssignmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.info(this.context, `Confirmando pago en gasto ${expenseId}`);
    return this.travelExpenseService.settleAssignment(expenseId, user.userId, dto);
  }
}
