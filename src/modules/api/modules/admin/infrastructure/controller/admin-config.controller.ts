import { Body, Controller, Get, Ip, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.request';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { SystemConfigService } from '@/core/modules/system-config/system-config.service';
import { LoggerProviderService } from '@/core/providers';
import { UserRole } from '@/modules/api/modules/users/domain/user-role.enum';

import { AuditLogService } from '../../application/audit-log.service';
import { SystemConfigItemDto, UpdateSystemConfigDto } from '../dto/system-config.dto';

@ApiTags('admin')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'))
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/config')
export class AdminConfigController {
  private readonly context = AdminConfigController.name;

  constructor(
    private readonly logger: LoggerProviderService,
    private readonly systemConfigService: SystemConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las variables de configuración del sistema' })
  @ApiOkResponse({ description: 'Lista de variables', type: [SystemConfigItemDto] })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN o SUPER_ADMIN' })
  async findAll() {
    this.logger.info(this.context, 'Listando configuración del sistema');
    return this.systemConfigService.findAll();
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Actualizar el valor de una variable de configuración' })
  @ApiParam({ name: 'key', type: String, description: 'Clave de la variable' })
  @ApiOkResponse({ description: 'Variable actualizada' })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN o SUPER_ADMIN' })
  async update(
    @Param('key') key: string,
    @Body() dto: UpdateSystemConfigDto,
    @CurrentUser() user: JwtPayload,
    @Ip() ip: string,
  ) {
    this.logger.info(this.context, `Actualizando config ${key} por ${user.userId}`);
    const oldValue = await this.systemConfigService.get(key, '');
    await this.systemConfigService.set(key, dto.value, user.userId);
    await this.auditLogService.log({
      adminId: user.userId,
      adminHandle: user.email,
      action: 'CONFIG_UPDATED',
      targetId: key,
      targetType: 'config',
      before: { value: oldValue },
      after: { value: dto.value },
      ip,
    });
  }
}
