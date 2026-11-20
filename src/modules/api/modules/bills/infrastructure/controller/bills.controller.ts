import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorators/api-error.response';
import { CurrentUser } from '@/common/decorators/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { BillsService } from '../../application/services/bills.service';
import { CreateBillDto, ImportBillsDto, UpdateBillDto } from '../dto/bill.dto';

@ApiTags('bills')
@Controller('bills')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'))
export class BillsController {
  private readonly context = BillsController.name;

  constructor(
    private readonly logger: LoggerProviderService,
    private readonly billsService: BillsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las facturas recurrentes del usuario' })
  @ApiOkResponse({ description: 'Lista de facturas recurrentes' })
  async findAll(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, 'GET /bills');
    return this.billsService.findAll(user.userId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Listar facturas recurrentes activas del usuario' })
  @ApiOkResponse({ description: 'Lista de facturas activas' })
  async findActive(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, 'GET /bills/active');
    return this.billsService.findActive(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear factura recurrente' })
  @ApiCreatedResponse({ description: 'Factura creada exitosamente' })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Datos inválidos')
  async create(@CurrentUser() user: JwtPayload, @Body() body: CreateBillDto) {
    this.logger.info(this.context, 'POST /bills');
    return this.billsService.create(body, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar factura recurrente' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la factura' })
  @ApiOkResponse({ description: 'Factura actualizada' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Factura no encontrada')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: UpdateBillDto,
  ) {
    this.logger.info(this.context, `PATCH /bills/${id}`);
    return this.billsService.update(id, body, user.userId);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Activar / desactivar factura recurrente' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la factura' })
  @ApiOkResponse({ description: 'Estado actualizado' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Factura no encontrada')
  async toggleActive(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    this.logger.info(this.context, `PATCH /bills/${id}/toggle`);
    return this.billsService.toggleActive(id, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar factura recurrente' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la factura' })
  @ApiOkResponse({ description: 'Factura eliminada' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Factura no encontrada')
  async delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    this.logger.info(this.context, `DELETE /bills/${id}`);
    await this.billsService.delete(id, user.userId);
    return { message: 'Factura eliminada' };
  }

  @Post('import/:budgetId')
  @ApiOperation({ summary: 'Importar facturas activas como gastos planificados en un presupuesto' })
  @ApiParam({ name: 'budgetId', type: String, description: 'ID del presupuesto destino' })
  @ApiCreatedResponse({ description: 'Gastos planificados creados desde facturas' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Presupuesto o facturas no encontradas')
  async importToBudget(
    @CurrentUser() user: JwtPayload,
    @Param('budgetId') budgetId: string,
    @Body() body: ImportBillsDto,
  ) {
    this.logger.info(this.context, `POST /bills/import/${budgetId}`);
    const count = await this.billsService.importToBudget(body, budgetId, user.userId);
    return { imported: count };
  }
}
