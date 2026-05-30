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

import { ApiErrorResponse } from '@/common/decorators/api-error.response';
import { CurrentUser } from '@/common/decorators/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { SavingAllocationService } from '../../application/services/allocations.service';
import { SavingsAllocationCreateDto } from '../dto/savings-allocation.dto';
import { UpdateSavingDistributionDto } from '../dto/update-saving-distribution.dto';

@ApiTags('allocations')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'))
@Controller('allocations')
export class SavingAllocationController {
  private readonly context: string = SavingAllocationController.name;
  constructor(
    private readonly logger: LoggerProviderService,
    private readonly savingAllocationService: SavingAllocationService,
  ) {}

  @Post('/')
  @ApiOperation({ summary: 'Crear una asignación de ahorro' })
  @ApiCreatedResponse({ description: 'Asignación creada exitosamente' })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'No autorizado')
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Datos inválidos')
  async create(@Body() body: SavingsAllocationCreateDto) {
    this.logger.info(this.context, 'Creando asignación de ahorro');
    const data = { ...body };
    return await this.savingAllocationService.create(data);
  }

  @Get('/:budgetId')
  @ApiOperation({ summary: 'Obtener asignaciones de ahorro por presupuesto' })
  @ApiParam({ name: 'budgetId', type: String, description: 'UUID del presupuesto' })
  @ApiOkResponse({ description: 'Lista de asignaciones de ahorro' })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'No autorizado')
  async find(@Param('budgetId') budgetId: string) {
    this.logger.info(this.context, 'Obteniendo asignaciones de ahorro');
    return await this.savingAllocationService.find(budgetId);
  }

  @Patch('/:budgetId')
  @ApiOperation({ summary: 'Reemplazar la plantilla de distribución de ahorro de un presupuesto' })
  @ApiParam({ name: 'budgetId', type: String, description: 'UUID del presupuesto' })
  @ApiOkResponse({ description: 'Distribución actualizada exitosamente' })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'No autorizado')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Presupuesto no encontrado')
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'La suma de porcentajes supera el 100%')
  async replace(
    @CurrentUser() user: JwtPayload,
    @Param('budgetId') budgetId: string,
    @Body() body: UpdateSavingDistributionDto,
  ) {
    this.logger.info(this.context, `Reemplazando distribución de ahorro para budget ${budgetId}`);
    return await this.savingAllocationService.replace(user.userId, budgetId, body.distributions);
  }
}
