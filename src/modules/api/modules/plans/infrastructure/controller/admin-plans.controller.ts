import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';
import { AdminGuard } from '@/common/guards/admin.guard';
import { LoggerProviderService } from '@/core/providers';

import { PlansService } from '../../application/services/plans.service';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';

@ApiTags('admin')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin/plans')
export class AdminPlansController {
  private readonly context: string = AdminPlansController.name;

  constructor(
    private readonly logger: LoggerProviderService,
    private readonly plansService: PlansService,
  ) {}

  @Get('/')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar todos los planes (incluyendo privados)' })
  @ApiOkResponse({ description: 'Lista de todos los planes' })
  @ApiForbiddenResponse({ description: 'Requiere rol admin' })
  async getAllPlans() {
    this.logger.info(this.context, 'Admin getting all plans');
    return this.plansService.getAllPlans();
  }

  @Post('/')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo plan' })
  @ApiOkResponse({ description: 'Plan creado exitosamente' })
  @ApiForbiddenResponse({ description: 'Requiere rol admin' })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Datos de plan inválidos')
  async createPlan(@Body() dto: CreatePlanDto) {
    this.logger.info(this.context, 'Admin creating plan');
    return this.plansService.createPlan(dto);
  }

  @Patch('/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar un plan existente' })
  @ApiParam({ name: 'id', type: String, description: 'UUID del plan' })
  @ApiOkResponse({ description: 'Plan actualizado exitosamente' })
  @ApiNotFoundResponse({ description: 'Plan no encontrado' })
  @ApiForbiddenResponse({ description: 'Requiere rol admin' })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    this.logger.info(this.context, `Admin updating plan ${id}`);
    return this.plansService.updatePlan(id, dto);
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un plan (soft delete)' })
  @ApiParam({ name: 'id', type: String, description: 'UUID del plan' })
  @ApiNoContentResponse({ description: 'Plan eliminado exitosamente' })
  @ApiNotFoundResponse({ description: 'Plan no encontrado' })
  @ApiForbiddenResponse({ description: 'Requiere rol admin' })
  async deletePlan(@Param('id') id: string) {
    this.logger.info(this.context, `Admin deleting plan ${id}`);
    await this.plansService.deletePlan(id);
  }
}
