import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { AdminGuard } from '@/common/guards/admin.guard';
import { LoggerProviderService } from '@/core/providers';

import { AdminUsersService } from '../../application/admin-users.service';
import { AdminStatsDto, PaginationDto, UpdateUserAdminDto } from '../dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin/users')
export class AdminUsersController {
  private readonly context: string = AdminUsersController.name;

  constructor(
    private readonly logger: LoggerProviderService,
    private readonly adminUsersService: AdminUsersService,
  ) {}

  @Get('/stats')
  @ApiOperation({ summary: 'Métricas y estadísticas globales del sistema' })
  @ApiOkResponse({ description: 'Estadísticas globales', type: AdminStatsDto })
  @ApiForbiddenResponse({ description: 'Requiere rol admin' })
  async getStats() {
    this.logger.info(this.context, 'Admin getting stats');
    return this.adminUsersService.getStats();
  }

  @Get('/')
  @ApiOperation({ summary: 'Listar todos los usuarios (paginado)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({ description: 'Lista paginada de usuarios' })
  @ApiForbiddenResponse({ description: 'Requiere rol admin' })
  async findAll(@Query() dto: PaginationDto) {
    this.logger.info(this.context, 'Admin listing users');
    return this.adminUsersService.findAll(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un usuario' })
  @ApiParam({ name: 'id', type: String, description: 'UUID del usuario' })
  @ApiOkResponse({ description: 'Detalle del usuario' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  @ApiForbiddenResponse({ description: 'Requiere rol admin' })
  async findById(@Param('id') id: string) {
    this.logger.info(this.context, `Admin getting user ${id}`);
    return this.adminUsersService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar role o isActive de un usuario' })
  @ApiParam({ name: 'id', type: String, description: 'UUID del usuario' })
  @ApiOkResponse({ description: 'Usuario actualizado' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  @ApiForbiddenResponse({ description: 'Requiere rol admin' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserAdminDto) {
    this.logger.info(this.context, `Admin updating user ${id}`);
    return this.adminUsersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete de un usuario (nulledAt)' })
  @ApiParam({ name: 'id', type: String, description: 'UUID del usuario' })
  @ApiOkResponse({ description: 'Usuario eliminado (soft delete)' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  @ApiForbiddenResponse({ description: 'Requiere rol admin' })
  async softDelete(@Param('id') id: string) {
    this.logger.info(this.context, `Admin soft deleting user ${id}`);
    return this.adminUsersService.softDelete(id);
  }
}
